import { PaneName } from "../types/InternalModel";
import { Cell, NumericalRange } from "../types/PublicModel";
import { ReactGridStore } from "../types/ReactGridStore";

export const getPaneNameByCell = (store: ReactGridStore, cell: Cell | null): PaneName | null => {
  if (!cell) return null;

  const paneRanges = Object.entries(store.paneRanges) as [PaneName, NumericalRange][];

  const parentPane = paneRanges.find(
    ([, range]) =>
      cell.rowIndex >= range.startRowIdx &&
      cell.rowIndex < range.endRowIdx &&
      cell.colIndex >= range.startColIdx &&
      cell.colIndex < range.endColIdx
  );

  return parentPane ? parentPane[0] : null;
};
