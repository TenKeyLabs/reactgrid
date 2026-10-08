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

const doRowRangesOverlap = (first: RowRange, second: RowRange) =>
  first.startRowIdx < second.endRowIdx && second.startRowIdx < first.endRowIdx;

const clampRowRange = (range: RowRange, bounds: RowRange): RowRange => ({
  startRowIdx: Math.max(range.startRowIdx, bounds.startRowIdx),
  endRowIdx: Math.min(range.endRowIdx, bounds.endRowIdx),
});

export const areRowRangesEqual = (first: RowRange, second: RowRange) =>
  first.startRowIdx === second.startRowIdx && first.endRowIdx === second.endRowIdx;

/** Every row of the grid, or `current` itself when it already covers them, so callers can compare by reference. */
export const getWholeGridRowRange = (rowMeasurements: RowMeasurement[], current: RowRange): RowRange => {
  const wholeGrid = { startRowIdx: 0, endRowIdx: rowMeasurements.length };

  return isRowRangeWithin(wholeGrid, current) ? current : wholeGrid;
};

/**
 * One step of a refill towards `target`: rows outside it leave at once, then at most `stepRows` enter, the visible
 * ones first (above the mounted rows, then below), followed by the overscan below and above. A current range that does
 * not overlap the target (a jump, or the whole grid before the first window) starts over from the first visible row.
 */
export const stepRowRangeToward = (
  current: RowRange,
  target: RowRange,
  visible: RowRange,
  stepRows: number
): RowRange => {
  const kept =
    current !== ALL_ROWS && doRowRangesOverlap(current, target)
      ? clampRowRange(current, target)
      : { startRowIdx: visible.startRowIdx, endRowIdx: visible.startRowIdx };
  const grownAbove = { ...kept, startRowIdx: Math.max(target.startRowIdx, kept.startRowIdx - stepRows) };
  const grownBelow = { ...kept, endRowIdx: Math.min(target.endRowIdx, kept.endRowIdx + stepRows) };
  const needsRowsAbove = kept.startRowIdx > target.startRowIdx;
  const needsRowsBelow = kept.endRowIdx < target.endRowIdx;

  switch (true) {
    case needsRowsAbove && kept.startRowIdx > visible.startRowIdx:
      return grownAbove;
    case needsRowsBelow && kept.endRowIdx < visible.endRowIdx:
      return grownBelow;
    case needsRowsBelow:
      return grownBelow;
    case needsRowsAbove:
      return grownAbove;
    default:
      return kept;
  }
};

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
