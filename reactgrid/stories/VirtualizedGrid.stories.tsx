import { useMemo, useState } from "react";
import { Cell, Column, ReactGrid, Row } from "../lib/main";
import { NonEditableCell } from "../lib/cellTemplates/NonEditableCell";
import { TextCell } from "../lib/cellTemplates/TextCell";
import { handleCopy } from "./utils/handleCopy";
import { handleCut } from "./utils/handleCut";
import { handlePaste } from "./utils/handlePaste";

const ROW_COUNT = 5_000;
const COLUMN_COUNT = 12;
const ROW_HEIGHT = 30;

const initialValues = Array.from({ length: ROW_COUNT }, (_, rowIndex) =>
  Array.from({ length: COLUMN_COUNT }, (_, colIndex) => `R${rowIndex} C${colIndex}`)
);

export const VirtualizedGrid = () => {
  const [values, setValues] = useState(initialValues);

  const updateValue = (rowIndex: number, colIndex: number, value: string) =>
    setValues((previous) =>
      previous.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex ? row.map((cell, currentColIndex) => (currentColIndex === colIndex ? value : cell)) : row
      )
    );

  const rows: Row[] = useMemo(
    () => Array.from({ length: ROW_COUNT + 1 }, (_, rowIndex) => ({ rowIndex, height: ROW_HEIGHT })),
    []
  );

  const columns: Column[] = useMemo(
    () => Array.from({ length: COLUMN_COUNT }, (_, colIndex) => ({ colIndex, width: 140 })),
    []
  );

  const headerCells: Cell[] = columns.map(({ colIndex }) => ({
    rowIndex: 0,
    colIndex,
    Template: NonEditableCell,
    props: { value: `Column ${colIndex}` },
  }));

  // Cells declare their clipboard callbacks so paste, cut and fill reach rows that are not mounted.
  const dataCells: Cell[] = values.flatMap((row, rowIndex) =>
    row.map((value, colIndex) => ({
      rowIndex: rowIndex + 1,
      colIndex,
      Template: TextCell,
      props: { text: value, onTextChanged: (newText: string) => updateValue(rowIndex, colIndex, newText) },
      onStringValueRequested: () => value,
      onStringValueReceived: (newValue: string) => updateValue(rowIndex, colIndex, newValue),
    }))
  );

  return (
    <div style={{ height: "80vh", width: "100%", overflow: "auto" }}>
      <ReactGrid
        id="virtualized-grid"
        virtualizeRows
        rowOverscanRatio={2 / 3}
        stickyTopRows={1}
        stickyLeftColumns={1}
        rows={rows}
        columns={columns}
        cells={[...headerCells, ...dataCells]}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
      />
    </div>
  );
};
