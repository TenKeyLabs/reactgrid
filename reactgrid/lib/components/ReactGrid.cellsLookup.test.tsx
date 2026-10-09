import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReactGrid } from "./ReactGrid";
import { NonEditableCell } from "../cellTemplates/NonEditableCell";
import { Cell } from "../types/PublicModel";
import { reactGridStores } from "../utils/reactGridStore";

const rowCount = 120;

const buildCells = (marker: string): Cell[] =>
  Array.from({ length: rowCount }, (_, rowIndex) => ({
    rowIndex,
    colIndex: 0,
    Template: NonEditableCell,
    props: { value: `${marker}-${rowIndex}` },
    onStringValueRequested: () => `${marker}-${rowIndex}`,
    onStringValueReceived: () => {},
  }));

const rows = Array.from({ length: rowCount }, (_, rowIndex) => ({ rowIndex, height: 30 }));
const columns = [{ colIndex: 0, width: 100 }];

describe("cells lookup with declared callbacks", () => {
  it("addresses every declared cell, and follows the latest cells after they change", () => {
    const { rerender } = render(
      <ReactGrid id="lookup" virtualizeRows rows={rows} columns={columns} cells={buildCells("first")} />
    );

    const lookup = () => reactGridStores.getState()["lookup"].getState().cellsLookup;

    expect(lookup().get("119 0")?.onStringValueRequested()).toBe("first-119");

    rerender(<ReactGrid id="lookup" virtualizeRows rows={rows} columns={columns} cells={buildCells("second")} />);

    expect(lookup().get("119 0")?.onStringValueRequested()).toBe("second-119");
  });
});
