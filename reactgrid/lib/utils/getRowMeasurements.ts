import { Row } from "../types/PublicModel";
import { RowMeasurement } from "../types/RowMeasurement";
import { getValueFromPixelString } from "./getValueFromPixelString";

/**
 * Derives row positions from the declared heights, mirroring the grid layout: a gap-wide padding, then rows separated by the gap.
 * Returns undefined when a height is not a pixel value, since such rows can only be measured once rendered.
 */
export const getRowMeasurements = (rows: Row[], gapWidth: number): RowMeasurement[] | undefined => {
  const measurements: RowMeasurement[] = [];
  let offsetTop = gapWidth;

  for (const row of rows) {
    const height = getValueFromPixelString(row.height);

    if (Number.isNaN(height)) return undefined;

    measurements.push({ height, offsetTop });
    offsetTop += height + gapWidth;
  }

  return measurements;
};
