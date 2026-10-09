import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReactGrid } from "./ReactGrid";
import { NonEditableCell } from "../cellTemplates/NonEditableCell";
import { Cell } from "../types/PublicModel";

const rowCount = 200;
const columnCount = 3;

const cells: Cell[] = Array.from({ length: rowCount }, (_, rowIndex) =>
  Array.from({ length: columnCount }, (_, colIndex) => ({
    rowIndex,
    colIndex,
    Template: NonEditableCell,
    props: { value: `${rowIndex}-${colIndex}` },
    onStringValueRequested: () => `${rowIndex}-${colIndex}`,
    onStringValueReceived: () => {},
  }))
).flat();

const rows = Array.from({ length: rowCount }, (_, rowIndex) => ({ rowIndex, height: 30 }));
const columns = Array.from({ length: columnCount }, (_, colIndex) => ({ colIndex, width: 100 }));

describe("ReactGrid with virtualizeRows", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders every row while the grid has no laid-out viewport, without hook or scroll errors", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(
      <div style={{ height: 300, overflow: "auto" }}>
        <ReactGrid id="virtualized" virtualizeRows stickyTopRows={1} rows={rows} columns={columns} cells={cells} />
      </div>
    );

    expect(container.querySelectorAll(".rgCellContainer")).toHaveLength(rowCount * columnCount);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
