import { useEffect } from "react";
import { ReactGridProps } from "../types/PublicModel";
import { focusCell } from "../utils/focusCell";
import { isSpanMember } from "../utils/isSpanMember";
import { ReactGridStore } from "../types/ReactGridStore";

export const useInitialFocusLocation = (
  store: ReactGridStore | undefined,
  rgProps: Partial<ReactGridProps>,
  devEnvironment: boolean
) => {
  useEffect(() => {
    if (store && rgProps.initialFocusLocation) {
      const { rowIndex, colIndex } = rgProps.initialFocusLocation;
      const cell = store.getCellByIndexes(rowIndex, colIndex);

      if (!cell) {
        return;
      }

      const targetCellOrSpanMember = store.getCellOrSpanMemberByIndexes(rowIndex, colIndex);

      if (devEnvironment) {
        if (!targetCellOrSpanMember) {
          console.error("The provided 'initialFocusLocation' does not exist!");
        } else if (isSpanMember(targetCellOrSpanMember))
          console.error("The provided 'initialFocusLocation' is invalid as it targets !");
      }

      focusCell(store, rowIndex, colIndex);
    }
  }, []);
};
