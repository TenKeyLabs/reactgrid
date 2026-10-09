import { Cell } from "../types/PublicModel.ts";
import { ReactGridStore } from "../types/ReactGridStore.ts";

/** The cell's mounted container element, if it is currently rendered. */
export function getCellContainer(store: ReactGridStore, cell: Cell) {
  return store.cellElements.getContainer(cell.rowIndex, cell.colIndex);
}
