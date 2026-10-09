import { RefObject, useLayoutEffect } from "react";
import { useReactGridId } from "../components/ReactGridIdProvider";
import { ALL_ROWS } from "../types/InternalModel";
import { RowMeasurement } from "../types/RowMeasurement";
import { reactGridStores, useReactGridStore } from "../utils/reactGridStore";
import { areRowRangesEqual, getRenderedRowRange } from "../utils/renderedRows";
import { getScrollableParent, getScrollViewport, isWindow } from "../utils/scrollHelpers";

/** Keeps the store's rendered row range aligned with the part of the grid scrolled into its nearest scrollable ancestor. */
export const useRenderedRowRange = (
  gridContentRef: RefObject<HTMLDivElement>,
  rowMeasurements: RowMeasurement[] | undefined,
  enabled: boolean,
  overscanRatio: number
) => {
  const id = useReactGridId();
  const setRenderedRowRange = useReactGridStore(id, (store) => store.setRenderedRowRange);

  // A layout effect, so the first window is committed before the browser paints the empty grid.
  useLayoutEffect(() => {
    const gridContent = gridContentRef.current;

    if (!enabled || !rowMeasurements || !gridContent) {
      setRenderedRowRange(ALL_ROWS);
      return;
    }

    const scrollParent = getScrollableParent(gridContent, false) ?? window;

    const update = () => {
      const viewport = getScrollViewport(scrollParent, gridContent);
      const current = reactGridStores.getState()[id].getState().renderedRowRange;
      // A viewport without height means the grid is not laid out (e.g. in a test DOM), so every row stays rendered.
      const next =
        viewport.height === 0
          ? ALL_ROWS
          : getRenderedRowRange(
              rowMeasurements,
              viewport.top,
              viewport.top + viewport.height,
              viewport.height * overscanRatio,
              current
            );

      if (!areRowRangesEqual(next, current)) {
        setRenderedRowRange(next);
      }
    };

    update();
    scrollParent.addEventListener("scroll", update, { passive: true });

    if (isWindow(scrollParent)) {
      scrollParent.addEventListener("resize", update);

      return () => {
        scrollParent.removeEventListener("scroll", update);
        scrollParent.removeEventListener("resize", update);
      };
    }

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(scrollParent);

    return () => {
      scrollParent.removeEventListener("scroll", update);
      resizeObserver.disconnect();
    };
  }, [enabled, rowMeasurements, overscanRatio, gridContentRef, id, setRenderedRowRange]);
};
