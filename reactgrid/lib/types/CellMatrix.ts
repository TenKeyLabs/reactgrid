import { CellMap, RowCells } from "./InternalModel";
import { CellsLookup } from "./PublicModel";
import { Column, Row } from "./PublicModel";

export type CellMatrix = {
  rows: Row[];
  columns: Column[];
  cells: CellMap;
  cellsByRow: RowCells[];
  cellsLookup: CellsLookup;
};
