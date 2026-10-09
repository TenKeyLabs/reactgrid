import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReactGrid } from "./ReactGrid";
import CellWrapper from "./CellWrapper";
import { Cell } from "../types/PublicModel";

const rowCount = 5;
const columnCount = 3;
const renderCounts = new Map<string, number>();

const CountingCell = ({ value }: { value: string }) => {
  renderCounts.set(value, (renderCounts.get(value) ?? 0) + 1);
  return <CellWrapper>{value}</CellWrapper>;
};

const buildCells = (changedRow?: number): Cell[] =>
  Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from({ length: columnCount }, (_, colIndex) => ({
      rowIndex,
      colIndex,
      Template: CountingCell,
      props: { value: `${rowIndex}-${colIndex}${rowIndex === changedRow ? "*" : ""}` },
    }))
  ).flat();

const rows = Array.from({ length: rowCount }, (_, rowIndex) => ({ rowIndex, height: 30 }));
const columns = Array.from({ length: columnCount }, (_, colIndex) => ({ colIndex, width: 100 }));

describe("row rendering", () => {
  it("re-renders only the row whose cells changed when the cells of the other rows keep their identity", () => {
    const firstCells = buildCells();
    const { rerender } = render(<ReactGrid id="rows" rows={rows} columns={columns} cells={firstCells} />);
    renderCounts.clear();

    const secondCells = firstCells.map((cell) =>
      cell.rowIndex === 2 ? { ...cell, props: { value: `${cell.props.value}*` } } : cell
    );
    rerender(<ReactGrid id="rows" rows={rows} columns={columns} cells={secondCells} />);

    expect([...renderCounts.keys()].sort()).toEqual(["2-0*", "2-1*", "2-2*"]);
  });
});
