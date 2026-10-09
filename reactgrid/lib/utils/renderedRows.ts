import { ALL_ROWS, RowRange } from "../types/InternalModel";
import { RowMeasurement } from "../types/RowMeasurement";

/** Fraction of the viewport height kept mounted beyond each viewport edge unless the grid is given `rowOverscanRatio`. */
export const DEFAULT_ROW_OVERSCAN_RATIO = 0.5;

const findFirstRowIndex = (rowMeasurements: RowMeasurement[], isAtOrBeyond: (row: RowMeasurement) => boolean) => {
  let low = 0;
  let high = rowMeasurements.length;

  while (low < high) {
    const middle = (low + high) >> 1;

    if (isAtOrBeyond(rowMeasurements[middle])) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  return low;
};

/** Rows intersecting the [top, bottom) span, both expressed in grid coordinates; clamped to the grid. */
export const getVisibleRowRange = (rowMeasurements: RowMeasurement[], top: number, bottom: number): RowRange => ({
  startRowIdx: findFirstRowIndex(rowMeasurements, (row) => row.offsetTop + row.height > top),
  endRowIdx: findFirstRowIndex(rowMeasurements, (row) => row.offsetTop >= bottom),
});

const isRowRangeWithin = (inner: RowRange, outer: RowRange) =>
  inner.startRowIdx >= outer.startRowIdx && inner.endRowIdx <= outer.endRowIdx;

export const areRowRangesEqual = (first: RowRange, second: RowRange) =>
  first.startRowIdx === second.startRowIdx && first.endRowIdx === second.endRowIdx;

/**
 * The rows to keep mounted: the viewport plus `overscan` pixels on each side. The current range is kept while it still
 * covers half the overscan around the viewport, so scrolling re-renders once per half-overscan rather than per row.
 */
export const getRenderedRowRange = (
  rowMeasurements: RowMeasurement[],
  viewportTop: number,
  viewportBottom: number,
  overscan: number,
  current: RowRange
): RowRange => {
  const requiredRows = getVisibleRowRange(rowMeasurements, viewportTop - overscan / 2, viewportBottom + overscan / 2);

  if (current !== ALL_ROWS && isRowRangeWithin(requiredRows, current)) {
    return current;
  }

  return getVisibleRowRange(rowMeasurements, viewportTop - overscan, viewportBottom + overscan);
};

/**
 * Row indexes a pane mounts: its range clipped to the rendered rows, plus the pinned row (the focused one) so keyboard
 * focus and open editors survive being scrolled out of view.
 */
export const getRowIndexesToRender = (paneRange: RowRange, renderedRowRange: RowRange, pinnedRowIndex: number) => {
  const startRowIdx = Math.max(paneRange.startRowIdx, renderedRowRange.startRowIdx);
  const endRowIdx = Math.min(paneRange.endRowIdx, renderedRowRange.endRowIdx);
  const rowIndexes = Array.from({ length: Math.max(0, endRowIdx - startRowIdx) }, (_, offset) => startRowIdx + offset);

  const isPinnedRowInPane = pinnedRowIndex >= paneRange.startRowIdx && pinnedRowIndex < paneRange.endRowIdx;
  const isPinnedRowRendered = pinnedRowIndex >= startRowIdx && pinnedRowIndex < endRowIdx;

  if (isPinnedRowInPane && !isPinnedRowRendered) {
    rowIndexes.push(pinnedRowIndex);
  }

  return rowIndexes;
};
