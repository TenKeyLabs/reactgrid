import { IndexedLocation, NO_CELL_LOCATION } from "../types/InternalModel";
import { ReactGridStore } from "../types/ReactGridStore";

/** The cell indexes carried by a hidden focus target element, or no location when the element is not one of this grid's. */
export const getHiddenFocusTargetLocation = (store: ReactGridStore, targetElement: Element): IndexedLocation => {
  if (!(targetElement instanceof HTMLElement) || !store.reactGridRef?.contains(targetElement)) {
    return NO_CELL_LOCATION;
  }

  const rowIndex = Number(targetElement.dataset.rowIndex);
  const colIndex = Number(targetElement.dataset.colIndex);

  return Number.isInteger(rowIndex) && Number.isInteger(colIndex) ? { rowIndex, colIndex } : NO_CELL_LOCATION;
};
