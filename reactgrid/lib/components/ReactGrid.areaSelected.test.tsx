import { act, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReactGrid } from "./ReactGrid";
import { NonEditableCell } from "../cellTemplates/NonEditableCell";
import { Cell } from "../types/PublicModel";
import { reactGridStores } from "../utils/reactGridStore";

const rowCount = 5;
const columnCount = 3;

const cells: Cell[] = Array.from({ length: rowCount * columnCount }, (_, index) => ({
  rowIndex: Math.floor(index / columnCount),
  colIndex: index % columnCount,
  Template: NonEditableCell,
  props: { value: `${index}` },
}));

const rows = Array.from({ length: rowCount }, (_, rowIndex) => ({ rowIndex, height: 30 }));
const columns = Array.from({ length: columnCount }, (_, colIndex) => ({ colIndex, width: 100 }));

describe("onAreaSelected", () => {
  it("reports each new selected area once, ignoring updates that leave it unchanged", () => {
    const onAreaSelected = vi.fn();
    render(<ReactGrid id="areaSelected" rows={rows} columns={columns} cells={cells} onAreaSelected={onAreaSelected} />);
    const store = () => reactGridStores.getState()["areaSelected"].getState();
    const area = { startRowIdx: 1, endRowIdx: 3, startColIdx: 0, endColIdx: 2 };

    act(() => store().setSelectedArea(area));
    act(() => store().setSelectedArea({ ...area }));
    act(() => store().setSelectedRows(2, 4));

    expect(onAreaSelected.mock.calls).toEqual([
      [area],
      [{ startRowIdx: 2, endRowIdx: 4, startColIdx: 0, endColIdx: columnCount }],
    ]);
  });
});
