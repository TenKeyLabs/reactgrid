import { describe, expect, it } from "vitest";
import { ALL_ROWS } from "../types/InternalModel";
import { getRowMeasurements } from "./getRowMeasurements";
import {
  getRenderedRowRange,
  getRowIndexesToRender,
  getVisibleRowRange,
  getWholeGridRowRange,
  stepRowRangeToward,
} from "./renderedRows";

const rows = Array.from({ length: 100 }, (_, rowIndex) => ({ rowIndex, height: 10 }));
const rowMeasurements = getRowMeasurements(rows, 1)!;

describe("getRowMeasurements", () => {
  it("positions rows after a gap-wide padding and separates them by the gap", () => {
    expect(rowMeasurements[0]).toEqual({ height: 10, offsetTop: 1 });
    expect(rowMeasurements[1]).toEqual({ height: 10, offsetTop: 12 });
    expect(rowMeasurements[99]).toEqual({ height: 10, offsetTop: 1 + 99 * 11 });
  });

  it("accepts pixel strings and rejects other units", () => {
    expect(getRowMeasurements([{ rowIndex: 0, height: "20px" }], 1)).toEqual([{ height: 20, offsetTop: 1 }]);
    expect(getRowMeasurements([{ rowIndex: 0, height: "auto" }], 1)).toBeUndefined();
  });
});

describe("getVisibleRowRange", () => {
  it("returns the rows intersecting the viewport", () => {
    // Row 4 spans [45, 55) and row 9 spans [100, 110), so both are partially inside [50, 105).
    expect(getVisibleRowRange(rowMeasurements, 50, 105)).toEqual({ startRowIdx: 4, endRowIdx: 10 });
  });

  it("clamps to the grid edges", () => {
    expect(getVisibleRowRange(rowMeasurements, -500, 20)).toEqual({ startRowIdx: 0, endRowIdx: 2 });
    expect(getVisibleRowRange(rowMeasurements, 1_090, 5_000)).toEqual({ startRowIdx: 99, endRowIdx: 100 });
    expect(getVisibleRowRange(rowMeasurements, 5_000, 6_000)).toEqual({ startRowIdx: 100, endRowIdx: 100 });
  });
});

describe("getRenderedRowRange", () => {
  // A 100px viewport with 50px of overscan on each side.
  const overscan = 50;

  it("extends the visible rows by the overscan on each side", () => {
    // [450, 650) covers rows 40 (ending at 451) through 58 (starting at 639).
    expect(getRenderedRowRange(rowMeasurements, 500, 600, overscan, ALL_ROWS)).toEqual({ startRowIdx: 40, endRowIdx: 59 });
  });

  it("keeps the current range while half the overscan around the viewport is still mounted", () => {
    const current = getRenderedRowRange(rowMeasurements, 500, 600, overscan, ALL_ROWS);

    expect(getRenderedRowRange(rowMeasurements, 520, 620, overscan, current)).toBe(current);
  });

  it("recomputes the range once the viewport uses up half the overscan", () => {
    const current = getRenderedRowRange(rowMeasurements, 500, 600, overscan, ALL_ROWS);

    // Needs rows up to 655, beyond the 650 the current range reaches, so it re-centres over [480, 680).
    expect(getRenderedRowRange(rowMeasurements, 530, 630, overscan, current)).toEqual({ startRowIdx: 43, endRowIdx: 62 });
  });

  it("never reaches beyond the grid", () => {
    expect(getRenderedRowRange(rowMeasurements, 0, 30, overscan, ALL_ROWS)).toEqual({ startRowIdx: 0, endRowIdx: 8 });
    expect(getRenderedRowRange(rowMeasurements, 1_080, 1_200, overscan, ALL_ROWS)).toEqual({ startRowIdx: 93, endRowIdx: 100 });
  });
});

describe("getWholeGridRowRange", () => {
  it("covers every row, and hands back the current range once it already does", () => {
    expect(getWholeGridRowRange(rowMeasurements, { startRowIdx: 10, endRowIdx: 50 })).toEqual({ startRowIdx: 0, endRowIdx: 100 });

    const covering = { startRowIdx: 0, endRowIdx: 100 };
    expect(getWholeGridRowRange(rowMeasurements, covering)).toBe(covering);
    expect(getWholeGridRowRange(rowMeasurements, ALL_ROWS)).toBe(ALL_ROWS);
  });
});

describe("stepRowRangeToward", () => {
  const target = { startRowIdx: 40, endRowIdx: 70 };
  const visible = { startRowIdx: 50, endRowIdx: 60 };

  it("starts a jump from the first visible row and fills the viewport downwards", () => {
    expect(stepRowRangeToward({ startRowIdx: 0, endRowIdx: 20 }, target, visible, 4)).toEqual({ startRowIdx: 50, endRowIdx: 54 });
    expect(stepRowRangeToward(ALL_ROWS, target, visible, 4)).toEqual({ startRowIdx: 50, endRowIdx: 54 });
  });

  it("drops the rows that left the target at once and mounts the visible rows before the overscan", () => {
    // Scrolling down: rows 30-39 leave, the visible rows 56-59 come first, then the overscan below, then above.
    const afterDrop = stepRowRangeToward({ startRowIdx: 30, endRowIdx: 56 }, target, visible, 4);
    expect(afterDrop).toEqual({ startRowIdx: 40, endRowIdx: 60 });
    expect(stepRowRangeToward(afterDrop, target, visible, 4)).toEqual({ startRowIdx: 40, endRowIdx: 64 });

    // Scrolling up: the visible rows above the mounted ones come first.
    expect(stepRowRangeToward({ startRowIdx: 55, endRowIdx: 80 }, target, visible, 4)).toEqual({ startRowIdx: 51, endRowIdx: 70 });
  });

  it("mounts the overscan above last and stops at the target", () => {
    expect(stepRowRangeToward({ startRowIdx: 45, endRowIdx: 70 }, target, visible, 4)).toEqual({ startRowIdx: 41, endRowIdx: 70 });
    expect(stepRowRangeToward({ startRowIdx: 41, endRowIdx: 70 }, target, visible, 4)).toEqual(target);
    expect(stepRowRangeToward(target, target, visible, 4)).toEqual(target);
  });
});

describe("getRowIndexesToRender", () => {
  const paneRange = { startRowIdx: 1, endRowIdx: 98 };

  it("clips the pane to the rendered rows", () => {
    expect(getRowIndexesToRender(paneRange, { startRowIdx: 40, endRowIdx: 43 }, -1)).toEqual([40, 41, 42]);
    expect(getRowIndexesToRender(paneRange, { startRowIdx: 0, endRowIdx: 3 }, -1)).toEqual([1, 2]);
    expect(getRowIndexesToRender(paneRange, ALL_ROWS, -1)).toHaveLength(97);
  });

  it("keeps the pinned row mounted when it lies outside the rendered rows but inside the pane", () => {
    expect(getRowIndexesToRender(paneRange, { startRowIdx: 40, endRowIdx: 43 }, 7)).toEqual([40, 41, 42, 7]);
    expect(getRowIndexesToRender(paneRange, { startRowIdx: 40, endRowIdx: 43 }, 41)).toEqual([40, 41, 42]);
    expect(getRowIndexesToRender(paneRange, { startRowIdx: 40, endRowIdx: 43 }, 0)).toEqual([40, 41, 42]);
  });
});
