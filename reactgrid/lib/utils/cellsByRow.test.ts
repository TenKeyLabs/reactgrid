import { describe, expect, it } from "vitest";
import { NonEditableCell } from "../cellTemplates/NonEditableCell";
import { Cell } from "../types/PublicModel";
import { reuseUnchangedRows } from "./cellsByRow";

const cell = (rowIndex: number, colIndex: number): Cell => ({
  rowIndex,
  colIndex,
  Template: NonEditableCell,
  props: { value: "" },
});

describe("reuseUnchangedRows", () => {
  it("keeps the previous array for rows whose cells are the same objects and takes the new one otherwise", () => {
    const shared = [cell(0, 0), cell(0, 1)];
    const previous = [shared, [cell(1, 0), cell(1, 1)]];
    const next = [[...shared], [cell(1, 0), cell(1, 1)]];

    const result = reuseUnchangedRows(next, previous);

    expect(result[0]).toBe(previous[0]);
    expect(result[1]).toBe(next[1]);
  });

  it("treats rows with a different width or no previous counterpart as changed", () => {
    const previous = [[cell(0, 0)]];
    const next = [[cell(0, 0), cell(0, 1)], [cell(1, 0)]];

    const result = reuseUnchangedRows(next, previous);

    expect(result[0]).toBe(next[0]);
    expect(result[1]).toBe(next[1]);
  });
});
