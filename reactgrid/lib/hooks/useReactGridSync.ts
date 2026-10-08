import { useEffect } from "react";
import { CellMatrix } from "../types/CellMatrix";
import { ReactGridStore, ReactGridStoreProps } from "../types/ReactGridStore";
import isEqual from "lodash.isequal";

export const useReactGridSync = (
  store: ReactGridStore | undefined,
  cellMatrix: CellMatrix,
  rgProps: Partial<ReactGridStoreProps>
) => {
  // sync grid props with store
  useEffect(() => {
    store?.setExternalData({ ...rgProps });
  }, [rgProps]);

  // sync rows with store
  useEffect(() => {
    if (store && !isEqual(cellMatrix.rows, store.rows)) {
      store.setExternalData({ rows: cellMatrix.rows });
    }
  }, [cellMatrix.rows]);

  // sync columns with store
  useEffect(() => {
    if (store && !isEqual(cellMatrix.columns, store.columns)) {
      store.setExternalData({ columns: cellMatrix.columns });
    }
  }, [cellMatrix.columns]);

  // sync cells with store
  useEffect(() => {
    // The matrix is memoized on the consumer's arrays, so a new one means changed cells; a deep compare would cost more than the update.
    if (store && cellMatrix.cells !== store.cells) {
      // Callbacks declared on the cells replace their previous versions; the ones registered by mounted CellWrappers are kept.
      const cellsLookup = new Map([...store.cellsLookup, ...cellMatrix.cellsLookup]);

      store.setExternalData({ cells: cellMatrix.cells, cellsLookup });
    }
  }, [cellMatrix.cells]);
};
