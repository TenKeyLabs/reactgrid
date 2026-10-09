import { useCallback } from "react";
import { reactGridStores } from "../utils/reactGridStore";
import { useReactGridId } from "./ReactGridIdProvider";

const HiddenFocusTarget = ({ rowIdx, colIdx }: { colIdx: number; rowIdx: number }) => {
  const storeId = useReactGridId();
  // The registry never changes identity, so it is read without a per-cell store subscription.
  const { cellElements } = reactGridStores()[storeId].getState();

  const registerFocusTarget = useCallback(
    (element: HTMLInputElement | null) => cellElements.registerFocusTarget(rowIdx, colIdx, element),
    [cellElements, rowIdx, colIdx]
  );

  return (
    <div style={{ position: "absolute", bottom: 0, right: "50%" }}>
      <input
        ref={registerFocusTarget}
        data-row-index={rowIdx}
        data-col-index={colIdx}
        onKeyDown={(e) => {
          // Let a 'tab' key to be triggered only by the GridWrapper onKeyDown event
          if (e.key === "Tab") e.preventDefault();
        }}
        className={`rgHiddenFocusTarget rgFocusRowIdx-${rowIdx} rgFocusColIdx-${colIdx}`}
        style={{ width: 1, height: 1, opacity: 0, cursor: "default" }}
        inputMode="none"
      />
    </div>
  );
};

export default HiddenFocusTarget;
