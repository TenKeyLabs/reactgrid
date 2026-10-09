import { RowCells } from "../types/InternalModel";

/** The rows of `next`, each replaced by its `previous` counterpart when every cell in it is the same object. */
export const reuseUnchangedRows = (next: RowCells[], previous: RowCells[]): RowCells[] =>
  next.map((rowCells, rowIndex) => {
    const previousRowCells = previous[rowIndex];
    const isUnchanged =
      previousRowCells !== undefined &&
      previousRowCells.length === rowCells.length &&
      rowCells.every((cell, colIndex) => cell === previousRowCells[colIndex]);

    return isUnchanged ? previousRowCells : rowCells;
  });
