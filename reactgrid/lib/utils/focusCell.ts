import { ReactGridStore } from "../types/ReactGridStore";
import { scrollCellIntoView } from "./scrollCellIntoView";

/** Brings the cell into view and moves keyboard focus to it, even when it is not mounted yet. */
export const focusCell = (store: ReactGridStore, rowIndex: number, colIndex: number) => {
  scrollCellIntoView(store, rowIndex, colIndex);
  store.cellElements.focus(rowIndex, colIndex);
};
