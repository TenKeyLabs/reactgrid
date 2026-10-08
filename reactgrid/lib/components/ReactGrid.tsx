import { FC, useEffect, useMemo, useRef, useState } from "react";
import { ErrorBoundary } from "./ErrorBoundary";
import GridWrapper from "./GridWrapper";
import PanesRenderer from "./PanesRenderer";
import { ReactGridIdProvider } from "./ReactGridIdProvider";
import { ReactGridProps } from "../types/PublicModel";
import isDevEnvironment from "../utils/isDevEnvironment";
import { initReactGridStore, reactGridStores } from "../utils/reactGridStore";
import { cellMatrixBuilder } from "../utils/cellMatrixBuilder";
import { useInitialFocusLocation } from "../hooks/useInitialFocusLocation";
import { useInitialSelectedRange } from "../hooks/useInitialSelectedRange";
import { v4 as uuidv4 } from "uuid";
import { useReactGridSync } from "../hooks/useReactGridSync";
import { ReactGridStore } from "../types/ReactGridStore";

const devEnvironment = isDevEnvironment();

export const ReactGrid: FC<ReactGridProps> = ({
  id,
  stickyTopRows,
  stickyBottomRows,
  stickyLeftColumns,
  stickyRightColumns,
  rows,
  columns,
  cells,
  ...rgProps
}) => {
  const reactGridId = useRef(id ?? `rg-${uuidv4()}`);

  // Consumer cell objects go into the matrix as they are, so the ones kept stable between renders skip re-rendering.
  const cellMatrix = useMemo(
    () => cellMatrixBuilder(rows, columns, ({ addCell }) => cells.forEach((cell) => cell !== null && addCell(cell))),
    [rows, columns, cells]
  );

  useEffect(() => {
    initReactGridStore(reactGridId.current, {
      ...rgProps,
      ...cellMatrix,
    });
  });

  const store = reactGridStores()[reactGridId.current];

  let storeState: ReactGridStore | undefined;

  if (store) {
    storeState = store.getState();
  }

  useReactGridSync(storeState, cellMatrix, rgProps);

  useInitialSelectedRange(storeState, rgProps, devEnvironment);
  useInitialFocusLocation(storeState, rgProps, devEnvironment);

  const [bypassSizeWarning, setBypassSizeWarning] = useState(false);

  if (
    devEnvironment &&
    !bypassSizeWarning &&
    !rgProps.virtualizeRows &&
    cellMatrix.rows.length * cellMatrix.columns.length > 25_000
  ) {
    return (
      <>
        <h1>You're about to render a huge grid!</h1>
        <p>
          The grid you provided exceeds 25 000 cells. You might experience performance problems. This message is
          displayed only in development environment.
        </p>
        <p>Are you sure you want to render it all?</p>
        <button onClick={() => setBypassSizeWarning(true)}>I understand, proceed anyway.</button>
      </>
    );
  }

  if (!storeState) {
    return null;
  }

  return (
    <ReactGridIdProvider id={reactGridId.current}>
      <ErrorBoundary>
        <GridWrapper reactGridId={reactGridId.current} style={{ position: "relative", ...rgProps.styles?.gridWrapper }}>
          <PanesRenderer
            stickyTopRows={stickyTopRows ?? 0}
            stickyBottomRows={stickyBottomRows ?? 0}
            stickyLeftColumns={stickyLeftColumns ?? 0}
            stickyRightColumns={stickyRightColumns ?? 0}
          />
        </GridWrapper>
      </ErrorBoundary>
    </ReactGridIdProvider>
  );
};
