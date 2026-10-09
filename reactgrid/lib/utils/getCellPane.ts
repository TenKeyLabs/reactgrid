import { Cell } from "../types/PublicModel.ts";
import { ReactGridStore } from "../types/ReactGridStore.ts";

export function getCellPane(store: ReactGridStore, cell: Cell): HTMLElement {
  const pane = store.cellElements.getContainer(cell.rowIndex, cell.colIndex)?.closest<HTMLElement>(".rgPane");

  if (!pane) throw new Error("No cellContainer found for this cell!");

  return pane;
}
