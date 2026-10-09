import { NonEditableCell } from "../cellTemplates/NonEditableCell";
import { CellMatrix } from "../types/CellMatrix";
import { RowCells, SpanMember } from "../types/InternalModel";
import { Cell, Column, Row } from "../types/PublicModel";

// Type `any` is required to use React.ComponentType here
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SetCellFn = <TComponent extends React.ComponentType<any>>(
  rowIndex: number,
  colIndex: number,
  Template: TComponent,
  props?: React.ComponentPropsWithRef<TComponent>,
  { ...args }?: Omit<Cell, "rowIndex" | "colIndex" | "Template" | "props">
) => void;

interface CellMatrixBuilderTools {
  setCell: SetCellFn;
  // Stores the given object itself, so cells the consumer keeps stable between renders keep their identity in the matrix.
  addCell: (cell: Cell) => void;
}

/**
 * Utility which helps you build your cell matrix in easy and type-safe way.
 * _You don't really have to use this if you don't need type safety
 * as long as you **keep proper structure** of your cellMatrix._
 *
 * It's `setCell` method infers the `props` type based on the provided `Template`
 * so that you don't have to specify it manually.
 *
 * @param builder Function which receives {@link CellMatrixBuilderTools} as an argument and is used to build your cell matrix
 * @returns cells
 */
export const cellMatrixBuilder = (
  rows: Row[] | undefined,
  columns: Column[] | undefined,
  builder: ({ ...tools }: CellMatrixBuilderTools) => void
): CellMatrix => {
  const cells = new Map();
  const cellsLookup = new Map();

  const addCell = (cell: Cell) => {
    const { rowIndex, colIndex } = cell;
    if (rowIndex === -1) throw new Error(`Row with id "${rowIndex}" isn't defined in rows array`);
    if (colIndex === -1) throw new Error(`Column with id "${colIndex}" isn't defined in columns array`);

    if (cells.has(`${rowIndex} ${colIndex}`)) {
      process.env.NODE_ENV === "development" && console.warn(`Cell with coordinates [${rowIndex}, ${colIndex}] already exists and will be overwritten!`);
      return;
    }

    const rowSpan = cell.rowSpan ?? 1;
    const colSpan = cell.colSpan ?? 1;

    for (let rowOffset = 0; rowOffset < rowSpan; rowOffset++) {
      const currentRowIndex = rowIndex + rowOffset;

      for (let colOffset = 0; colOffset < colSpan; colOffset++) {
        const currentColIndex = colIndex + colOffset;

        if (rowOffset === 0 && colOffset === 0) continue;

        const spanMember: SpanMember = {
          originRowIndex: rowIndex,
          originColIndex: colIndex,
        };

        cells.set(`${currentRowIndex} ${currentColIndex}`, spanMember);
      }
    }

    // Cells declaring their clipboard callbacks are reachable without being mounted; the others register from CellWrapper while rendered.
    if (cell.onStringValueRequested || cell.onStringValueReceived) {
      cellsLookup.set(`${rowIndex} ${colIndex}`, {
        rowIndex,
        colIndex,
        onStringValueRequested: cell.onStringValueRequested ?? (() => ""),
        onStringValueReceived: cell.onStringValueReceived ?? (() => {}),
      });
    }

    cells.set(`${rowIndex} ${colIndex}`, cell);
  };

  const setCell: SetCellFn = (rowIndex, colIndex, Template, props, { ...args }) =>
    addCell({
      rowIndex,
      colIndex,
      Template,
      props,
      ...Object.fromEntries(Object.entries(args).filter(([_, value]) => value !== undefined)),
    });

  builder({ setCell, addCell });

  // Reduced rather than spread: a spread passes every cell as an argument and overflows the call stack on big grids.
  const maxRowIndex = Array.from(cells.values()).reduce((max, cell) => Math.max(max, cell.rowIndex ?? -1), -1);
  const maxColIndex = Array.from(cells.values()).reduce((max, cell) => Math.max(max, cell.colIndex ?? -1), -1);

  for (let rowIndex = 0; rowIndex <= maxRowIndex; rowIndex++) {
    for (let colIndex = 0; colIndex <= maxColIndex; colIndex++) {
      const cellKey = `${rowIndex} ${colIndex}`;
      if (!cells.has(cellKey)) {
        cells.set(cellKey, {
          rowIndex,
          colIndex,
          Template: NonEditableCell,
          props: {
            value: "",
          },
        });
      }
    }
  }

  const cellsByRow: RowCells[] = Array.from({ length: maxRowIndex + 1 }, (_, rowIndex) =>
    Array.from({ length: maxColIndex + 1 }, (_, colIndex) => cells.get(`${rowIndex} ${colIndex}`)!)
  );

  return {
    cellsLookup,
    cells,
    cellsByRow,
    rows: initGridRows(maxRowIndex, rows),
    columns: initGridColumns(maxColIndex, columns),
  };
};

const initGridRows = (maxRowIndex: number, rows?: Row[]): Row[] => {
  const customRowMap = new Map<number, Row>();
  if (rows) {
    rows.forEach((row) => {
      customRowMap.set(row.rowIndex, row);
    });
  }

  return Array.from({ length: maxRowIndex + 1 }).map((_, idx) => {
    const customRow = customRowMap.get(idx);
    return {
      rowIndex: idx,
      height: customRow?.height ?? 25,
      reorderable: customRow?.reorderable ?? true,
    };
  });
};

const initGridColumns = (maxColIndex: number, columns?: Column[]): Column[] => {
  const customColumnMap = new Map<number, Column>();
  if (columns) {
    columns.forEach((col) => {
      customColumnMap.set(col.colIndex, col);
    });
  }

  return Array.from({ length: maxColIndex + 1 }).map((_, idx) => {
    const customCol = customColumnMap.get(idx);
    return {
      colIndex: idx,
      resizable: customCol?.resizable ?? true,
      reorderable: customCol?.reorderable ?? true,
      width: customCol?.width ?? 150,
      minWidth: customCol?.minWidth ?? 150,
    };
  });
};
