import { ReactGridStore } from "../types/ReactGridStore";

/** The cell's mounted hidden focus input, if the cell is currently rendered. */
export const getHiddenTargetFocusByIdx = (store: ReactGridStore, rowIdx: number, colIdx: number) =>
  store.cellElements.getFocusTarget(rowIdx, colIdx) ?? null;
