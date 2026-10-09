import React, { CSSProperties, useCallback, useEffect, useRef } from "react";
import { NumericalRange } from "../types/PublicModel";
import { ALL_ROWS, EMPTY_AREA, GetCellOffsets, PaneName, RowCells, StickyOffsets } from "../types/InternalModel";
import { isSpanMember } from "../utils/isSpanMember";
import { getRowIndexesToRender } from "../utils/renderedRows";
import { areAreasEqual } from "../utils/areAreasEqual";
import { reactGridStores, useReactGridStore } from "../utils/reactGridStore";
import { useTheme } from "../hooks/useTheme";
import { CellContextProvider } from "./CellContext";
import { PartialArea } from "./PartialArea";
import { useReactGridId } from "./ReactGridIdProvider";
import { RGTheme } from "../types/RGTheme";
import isEqual from "lodash.isequal";
import { isCellInRange } from "../utils/isCellInRange";
import { RowReorderBehavior } from "../behaviors/RowReorderBehavior";
import { DefaultBehavior } from "../behaviors/DefaultBehavior";
import { ColumnReorderBehavior } from "../behaviors/ColumnReorderBehavior";

interface PaneGridContentProps {
  paneName: PaneName;
  range: NumericalRange;
  className?: string;
  style?: React.CSSProperties;
  stickyOffsets?: StickyOffsets;
  getCellOffset?: (rowIdx: number, colIdx: number, rowSpan: number, colSpan: number) => CSSProperties;
}

const shouldMemoGridContent = (prevProps: PaneGridContentProps, nextProps: PaneGridContentProps) => {
  const {
    startRowIdx: prevStartRowIdx,
    endRowIdx: prevEndRowIdx,
    startColIdx: prevStartColIdx,
    endColIdx: prevEndColIdx,
  } = prevProps.range;

  const {
    startRowIdx: nextStartRowIdx,
    endRowIdx: nextEndRowIdx,
    startColIdx: nextStartColIdx,
    endColIdx: nextEndColIdx,
  } = nextProps.range;

  if (
    prevStartRowIdx !== nextStartRowIdx ||
    prevEndRowIdx !== nextEndRowIdx ||
    prevStartColIdx !== nextStartColIdx ||
    prevEndColIdx !== nextEndColIdx ||
    prevProps.getCellOffset !== nextProps.getCellOffset
  ) {
    return false;
  }

  return true;
};

interface PaneRowProps {
  rowIndex: number;
  realRowIndex: number;
  rowCells: RowCells | undefined;
  startColIdx: number;
  columnCount: number;
  getCellOffset: NonNullable<PaneGridContentProps["getCellOffset"]>;
  /** The selected area when it can contain cells of this row, otherwise the empty area. */
  selection: NumericalRange;
  /** The area whose cells must re-render after a reorder when it can contain cells of this row, otherwise the empty area. */
  reorderedArea: NumericalRange;
  focusedColIndex: number | undefined;
}

const areRowPropsEqual = (prev: PaneRowProps, next: PaneRowProps) =>
  prev.rowCells === next.rowCells &&
  prev.rowIndex === next.rowIndex &&
  prev.realRowIndex === next.realRowIndex &&
  prev.startColIdx === next.startColIdx &&
  prev.columnCount === next.columnCount &&
  prev.getCellOffset === next.getCellOffset &&
  prev.focusedColIndex === next.focusedColIndex &&
  areAreasEqual(prev.selection, next.selection) &&
  areAreasEqual(prev.reorderedArea, next.reorderedArea);

// One memoized unit per row, so a store update re-renders only the rows it touches rather than every mounted cell.
const PaneRow: React.FC<PaneRowProps> = React.memo(
  ({
    rowIndex,
    realRowIndex,
    rowCells,
    startColIdx,
    columnCount,
    getCellOffset,
    selection,
    reorderedArea,
    focusedColIndex,
  }) => {
    const id = useReactGridId();
    const store = reactGridStores()[id].getState();

    return Array.from({ length: columnCount }, (_, colIndex) => {
      const realColumnIndex = startColIdx + colIndex;
      const cell = rowCells?.[realColumnIndex];

      if (!cell || isSpanMember(cell)) return null;

      return (
        <CellContextProvider
          key={realColumnIndex}
          rowIndex={rowIndex}
          colIndex={colIndex}
          cell={cell}
          rowSpan={cell.rowSpan}
          colSpan={cell.colSpan}
          realRowIndex={realRowIndex}
          realColumnIndex={realColumnIndex}
          getCellOffset={getCellOffset}
          shouldRenderReorderedCells={isCellInRange(store, cell, reorderedArea)}
          isSelected={isCellInRange(store, cell, selection)}
          isFocused={focusedColIndex === realColumnIndex}
        />
      );
    });
  },
  areRowPropsEqual
);

// A cell counts as inside an area only when its own row does, so rows outside it can skip the per-cell checks.
const areaTouchingRow = (area: NumericalRange, realRowIndex: number) =>
  area.startRowIdx <= realRowIndex && realRowIndex < area.endRowIdx ? area : EMPTY_AREA;

export const PaneGridContent: React.FC<PaneGridContentProps> = React.memo(
  ({ paneName, range, getCellOffset = () => ({}), stickyOffsets }) => {
    const { startRowIdx, startColIdx, endColIdx } = range;

    const id = useReactGridId();

    const columns = useReactGridStore(id, (store) => store.columns).slice(startColIdx, endColIdx);
    const cellsByRow = useReactGridStore(id, (store) => store.cellsByRow);
    const focusedCell = useReactGridStore(id, (store) => store.focusedLocation);
    const selectedArea = useReactGridStore(id, (store) => store.selectedArea);

    // Sticky row panes always mount in full; only the panes that scroll vertically are clipped to the rendered rows,
    // and only they re-render when the rendered rows change.
    const isVerticallyScrollable = paneName === "Left" || paneName === "Center" || paneName === "Right";
    const renderedRowRange = useReactGridStore(id, (store) =>
      isVerticallyScrollable ? store.renderedRowRange : ALL_ROWS
    );
    const rowIndexes = getRowIndexesToRender(range, renderedRowRange, focusedCell.rowIndex);

    const currentBehavior = useReactGridStore(id, (store) => store.currentBehavior);
    const prevBehaviorId = useRef(currentBehavior.id);
    const prevSelectedArea = useRef(selectedArea);

    // store previous behavior id and selected area. Necessary for proper memoization of cells
    useEffect(() => {
      return () => {
        prevBehaviorId.current = currentBehavior.id;
        prevSelectedArea.current = selectedArea;
      };
    }, [currentBehavior.id, selectedArea]);

    const memoizedGetCellOffset = useCallback(getCellOffset, [stickyOffsets]);

    // Cells that took part in a reorder need one render after it ends, as their memoized positions are stale.
    const hasReorderEnded =
      (prevBehaviorId.current === RowReorderBehavior.id || prevBehaviorId.current === ColumnReorderBehavior.id) &&
      currentBehavior.id === DefaultBehavior().id;
    const reorderedArea: NumericalRange = hasReorderEnded
      ? {
          startRowIdx: Math.min(prevSelectedArea.current.startRowIdx, selectedArea.startRowIdx),
          endRowIdx: Math.max(prevSelectedArea.current.endRowIdx, selectedArea.endRowIdx),
          startColIdx: Math.min(prevSelectedArea.current.startColIdx, selectedArea.startColIdx),
          endColIdx: Math.max(prevSelectedArea.current.endColIdx, selectedArea.endColIdx),
        }
      : EMPTY_AREA;

    // Rows are keyed by their real index, so cells keep their identity (and focus) when the rendered window shifts.
    return rowIndexes.map((realRowIndex) => (
      <PaneRow
        key={realRowIndex}
        rowIndex={realRowIndex - startRowIdx}
        realRowIndex={realRowIndex}
        rowCells={cellsByRow[realRowIndex]}
        startColIdx={startColIdx}
        columnCount={columns.length}
        getCellOffset={memoizedGetCellOffset}
        selection={areaTouchingRow(selectedArea, realRowIndex)}
        reorderedArea={areaTouchingRow(reorderedArea, realRowIndex)}
        focusedColIndex={focusedCell.rowIndex === realRowIndex ? focusedCell.colIndex : undefined}
      />
    ));
  },
  shouldMemoGridContent
);

const getPaneBackgroundStyle = (paneName: PaneName, range: NumericalRange, gap: RGTheme["gap"]) => {
  let style: CSSProperties = {
    position: "sticky",
    gridRowStart: range.startRowIdx + 1,
    gridRowEnd: range.endRowIdx + 1,
    gridColumnStart: range.startColIdx + 1,
    gridColumnEnd: range.endColIdx + 1,
    backgroundColor: gap.color,
  };

  if (paneName === "TopLeft" || paneName === "TopCenter" || paneName === "TopRight") {
    style = {
      ...style,
      top: 0,
      height: `calc(100% + 2*${gap.width})`,
      marginTop: `-${gap.width}`,
    };
  }
  if (paneName === "TopRight" || paneName === "Right" || paneName === "BottomRight") {
    style = {
      ...style,
      right: 0,
      width: `calc(100% + 2*${gap.width})`,
      marginLeft: `-${gap.width}`,
    };
  }
  if (paneName === "BottomLeft" || paneName === "BottomCenter" || paneName === "BottomRight") {
    style = {
      ...style,
      bottom: 0,
      height: `calc(100% + 2*${gap.width})`,
      marginTop: `-${gap.width}`,
    };
  }
  if (paneName === "TopLeft" || paneName === "Left" || paneName === "BottomLeft") {
    style = {
      ...style,
      left: 0,
      width: `calc(100% + 2*${gap.width})`,
      marginLeft: `-${gap.width}`,
    };
  }

  return style;
};

interface PaneProps {
  paneName: PaneName;
  style?: React.CSSProperties;

  gridContentRange: NumericalRange;
  getCellOffset?: GetCellOffsets;
  stickyOffsets?: StickyOffsets;

  shouldRender?: boolean;
}

export const Pane: React.FC<PaneProps> = ({
  paneName,
  style,
  gridContentRange,
  getCellOffset,
  stickyOffsets,
  shouldRender = true,
}) => {
  const theme = useTheme();
  const id = useReactGridId();
  const focusedCell = useReactGridStore(id, (store) => store.getFocusedCell());
  const focusedCellArea = focusedCell
    ? {
        startRowIdx: focusedCell.rowIndex,
        endRowIdx: focusedCell.rowIndex + (focusedCell.rowSpan ?? 1),
        startColIdx: focusedCell.colIndex,
        endColIdx: focusedCell.colIndex + (focusedCell.colSpan ?? 1),
      }
    : EMPTY_AREA;

  const selectedArea = useReactGridStore(id, (store) => store.selectedArea);

  const fillHandleArea = useReactGridStore(id, (store) => store.fillHandleArea);

  const isFillHandleActive = !isEqual(fillHandleArea, EMPTY_AREA);

  if (!shouldRender) return null;

  return (
    <div className={`rgPane rgPane-${paneName}`} style={{ display: "contents", ...style }}>
      {paneName !== "Center" && (
        <div
          className={`rgPaneBackground rgPaneBackground-${paneName}`}
          style={getPaneBackgroundStyle(paneName, gridContentRange, theme.gap)}
        />
      )}
      <PaneGridContent
        paneName={paneName}
        range={gridContentRange}
        getCellOffset={getCellOffset}
        stickyOffsets={stickyOffsets}
      />
      {isFillHandleActive && (
        <PartialArea
          areaRange={fillHandleArea}
          parentPaneRange={gridContentRange}
          parentPaneName={paneName}
          getCellOffset={getCellOffset}
          isFillHandlePartial
          border={theme.fillHandle.border}
          style={{ background: theme.focusIndicator.background }}
          className="rgFillHandleIndicator"
        />
      )}
      {selectedArea && !areAreasEqual(focusedCellArea, selectedArea) && (
        <PartialArea
          areaRange={{
            startRowIdx: selectedArea.startRowIdx,
            endRowIdx: selectedArea.endRowIdx,
            startColIdx: selectedArea.startColIdx,
            endColIdx: selectedArea.endColIdx,
          }}
          parentPaneRange={gridContentRange}
          parentPaneName={paneName}
          getCellOffset={getCellOffset}
          border={theme.selectionIndicator.border}
          style={{ background: theme.selectionIndicator.background }}
          className="rgSelectionIndicator"
        />
      )}

      {focusedCell && (
        <PartialArea
          areaRange={focusedCellArea}
          parentPaneRange={gridContentRange}
          parentPaneName={paneName}
          getCellOffset={getCellOffset}
          isFocusedCellPartial
          border={theme.focusIndicator.border}
          style={{ background: theme.focusIndicator.background }}
          className="rgFocusIndicator"
        />
      )}
    </div>
  );
};
