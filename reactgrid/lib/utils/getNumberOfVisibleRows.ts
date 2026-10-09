import { ReactGridStore } from "../types/ReactGridStore";
import { getTheme } from "./getTheme";
import { getValueFromPixelString } from "./getValueFromPixelString";
import { getStickyRowsHeights } from "./scrollCellIntoView";
import { getScrollableParent, getScrollViewport } from "./scrollHelpers";

/** How many rows of the given row's height fit in the viewport beside the sticky rows. */
export const getNumberOfVisibleRows = (store: ReactGridStore, rowIndex: number) => {
  const gridElement = store.reactGridRef;
  const row = store.rowMeasurements[rowIndex];

  if (!gridElement || !row) return 0;

  const viewport = getScrollViewport(getScrollableParent(gridElement, false) ?? window, gridElement);
  const gapWidth = getValueFromPixelString(getTheme(store).gap.width || 0);
  const stickyRows = getStickyRowsHeights(store, gapWidth);

  return Math.max(0, Math.floor((viewport.height - stickyRows.top - stickyRows.bottom) / (row.height + gapWidth)));
};
