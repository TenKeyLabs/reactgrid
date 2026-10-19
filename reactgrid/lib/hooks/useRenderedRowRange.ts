import { RefObject, useLayoutEffect } from "react";
import { useReactGridId } from "../components/ReactGridIdProvider";
import { ALL_ROWS, RowRange } from "../types/InternalModel";
import { RowMeasurement } from "../types/RowMeasurement";
import { reactGridStores, useReactGridStore } from "../utils/reactGridStore";
import {
  areRowRangesEqual,
  getRenderedRowRange,
  getVisibleRowRange,
  getWholeGridRowRange,
  stepRowRangeToward,
} from "../utils/renderedRows";
import { getScrollableParent, getScrollViewport, isWindow } from "../utils/scrollHelpers";

/**
 * Keeps the store's rendered row range up to date: with `virtualizeRows` it follows the part of the grid scrolled into
 * the nearest scrollable ancestor, without it every row ends up mounted. Rows enter in one commit, or with
 * `rowsMountedPerFrame` that many per animation frame, the visible ones first.
 */
export const useRenderedRowRange = (
  gridContentRef: RefObject<HTMLDivElement | null>,
  rowMeasurements: RowMeasurement[] | undefined,
  virtualizeRows: boolean,
  overscanRatio: number,
  rowsMountedPerFrame: number | undefined
) => {
  const id = useReactGridId();
  const setRenderedRowRange = useReactGridStore(id, (store) => store.setRenderedRowRange);

  // A layout effect, so the first rows are committed before the browser paints the empty grid.
  useLayoutEffect(() => {
    const gridContent = gridContentRef.current;

    if (!rowMeasurements || !gridContent) {
      setRenderedRowRange(ALL_ROWS);
      return;
    }

    const scrollParent = getScrollableParent(gridContent, false) ?? window;
    const getCurrentRange = () => reactGridStores.getState()[id].getState().renderedRowRange;

    let target: RowRange | undefined;
    let frameHandle: number | undefined;

    const cancelRefill = () => {
      if (frameHandle !== undefined) cancelAnimationFrame(frameHandle);
      frameHandle = target = undefined;
    };

    const advance = (stepRows: number) => {
      frameHandle = undefined;
      if (!target) return;

      const viewport = getScrollViewport(scrollParent, gridContent);
      const visible = getVisibleRowRange(rowMeasurements, viewport.top, viewport.top + viewport.height);
      const current = getCurrentRange();
      const next = stepRowRangeToward(current, target, visible, stepRows);

      if (!areRowRangesEqual(next, current)) {
        setRenderedRowRange(next);
      }

      if (areRowRangesEqual(next, target)) {
        target = undefined;
      } else {
        frameHandle = requestAnimationFrame(() => advance(stepRows));
      }
    };

    const update = () => {
      const current = getCurrentRange();

      // Once every row of a grid without virtualization is mounted, scrolling has nothing left to do.
      if (!virtualizeRows && getWholeGridRowRange(rowMeasurements, current) === current) return;

      const viewport = getScrollViewport(scrollParent, gridContent);

      // A viewport without height means the grid is not laid out (e.g. in a test DOM), so every row stays rendered.
      if (viewport.height === 0) {
        cancelRefill();
        if (current !== ALL_ROWS) setRenderedRowRange(ALL_ROWS);
        return;
      }

      const refilled = virtualizeRows
        ? getRenderedRowRange(
            rowMeasurements,
            viewport.top,
            viewport.top + viewport.height,
            viewport.height * overscanRatio,
            current
          )
        : getWholeGridRowRange(rowMeasurements, current);

      // The required rows are mounted (or a refill towards them is under way), so nothing changes.
      if (refilled === current) return;

      if (rowsMountedPerFrame === undefined) {
        setRenderedRowRange(refilled);
        return;
      }

      target = refilled;
      // The first rows of a refill land in the scroll frame itself; the rest follow one frame at a time.
      if (frameHandle === undefined) advance(rowsMountedPerFrame);
    };

    update();
    scrollParent.addEventListener("scroll", update, { passive: true });

    if (isWindow(scrollParent)) {
      scrollParent.addEventListener("resize", update);

      return () => {
        cancelRefill();
        scrollParent.removeEventListener("scroll", update);
        scrollParent.removeEventListener("resize", update);
      };
    }

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(scrollParent);

    return () => {
      cancelRefill();
      scrollParent.removeEventListener("scroll", update);
      resizeObserver.disconnect();
    };
  }, [virtualizeRows, rowMeasurements, overscanRatio, rowsMountedPerFrame, gridContentRef, id, setRenderedRowRange]);
};
