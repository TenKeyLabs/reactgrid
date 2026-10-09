import { IndexedLocation } from "../types/InternalModel.ts";
import { ReactGridStore } from "../types/ReactGridStore.ts";

/** The mounted container element of the cell at the given indexes, if it is currently rendered. */
export function getCellContainerByIndexes(store: ReactGridStore, cellIdx: IndexedLocation) {
  return store.cellElements.getContainer(cellIdx.rowIndex, cellIdx.colIndex);
}
