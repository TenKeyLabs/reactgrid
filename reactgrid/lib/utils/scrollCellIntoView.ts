import { ReactGridStore } from "../types/ReactGridStore";
import { getTheme } from "./getTheme";
import { getValueFromPixelString } from "./getValueFromPixelString";
import { getScrollableParent, getScrollViewport } from "./scrollHelpers";

/** How far to move so the [start, end] span becomes fully visible within [visibleStart, visibleEnd]. */
const getScrollDelta = (start: number, end: number, visibleStart: number, visibleEnd: number) => {
  if (start < visibleStart) return start - visibleStart;
  if (end > visibleEnd) return end - visibleEnd;
  return 0;
};

/** Heights (gaps included) the sticky rows cover at the top and bottom of the viewport when stuck. */
export const getStickyRowsHeights = (store: ReactGridStore, gapWidth: number) => {
  const { paneRanges, rowMeasurements } = store;
  const lastRow = rowMeasurements[rowMeasurements.length - 1];
  const firstBottomStickyRow = rowMeasurements[paneRanges.BottomCenter.startRowIdx];
  const gridHeight = lastRow ? lastRow.offsetTop + lastRow.height + gapWidth : 0;

  return {
    top: paneRanges.TopCenter.endRowIdx > 0 ? (rowMeasurements[paneRanges.TopCenter.endRowIdx]?.offsetTop ?? 0) : 0,
    bottom: firstBottomStickyRow ? gridHeight - firstBottomStickyRow.offsetTop : 0,
  };
};

const getStickyColumnsWidths = (store: ReactGridStore, gapWidth: number) => {
  const { paneRanges, colMeasurements } = store;
  const lastColumn = colMeasurements[colMeasurements.length - 1];
  const firstRightStickyColumn = colMeasurements[paneRanges.Right.startColIdx];
  const gridWidth = lastColumn ? lastColumn.offsetLeft + lastColumn.width + gapWidth : 0;

  return {
    left: paneRanges.Left.endColIdx > 0 ? (colMeasurements[paneRanges.Left.endColIdx]?.offsetLeft ?? 0) : 0,
    right: firstRightStickyColumn ? gridWidth - firstRightStickyColumn.offsetLeft : 0,
  };
};

/**
 * Scrolls the nearest scrollable ancestor so the cell is fully visible beside the sticky panes.
 * Positions come from the row and column measurements, so the cell does not need to be mounted.
 */
export const scrollCellIntoView = (store: ReactGridStore, rowIndex: number, colIndex: number) => {
  const gridElement = store.reactGridRef;

  if (!gridElement) return;

  const scrollParent = getScrollableParent(gridElement, false) ?? window;
  const viewport = getScrollViewport(scrollParent, gridElement);

  // Without a laid-out viewport (e.g. a test DOM) there is nothing to bring into view.
  if (viewport.height === 0 || typeof scrollParent.scrollBy !== "function") return;

  const gapWidth = getValueFromPixelString(getTheme(store).gap.width || 0);
  const { paneRanges, rowMeasurements, colMeasurements } = store;

  const row = rowMeasurements[rowIndex];
  const isRowSticky = rowIndex < paneRanges.TopCenter.endRowIdx || rowIndex >= paneRanges.BottomCenter.startRowIdx;
  let top = 0;

  if (row && !isRowSticky) {
    const stickyRows = getStickyRowsHeights(store, gapWidth);
    top = getScrollDelta(
      row.offsetTop,
      row.offsetTop + row.height + gapWidth,
      viewport.top + stickyRows.top,
      viewport.top + viewport.height - stickyRows.bottom
    );
  }

  const column = colMeasurements[colIndex];
  const isColumnSticky = colIndex < paneRanges.Left.endColIdx || colIndex >= paneRanges.Right.startColIdx;
  let left = 0;

  if (column && !isColumnSticky) {
    const stickyColumns = getStickyColumnsWidths(store, gapWidth);
    left = getScrollDelta(
      column.offsetLeft,
      column.offsetLeft + column.width + gapWidth,
      viewport.left + stickyColumns.left,
      viewport.left + viewport.width - stickyColumns.right
    );
  }

  if (top !== 0 || left !== 0) {
    scrollParent.scrollBy({ top, left });
  }
};
