import { IndexedLocation } from "../types/InternalModel";

/**
 * Tracks the mounted DOM elements of cells so a cell can be reached by its coordinates without querying the document.
 * With row virtualization the targeted cell may not be mounted yet, so a focus request is kept until its hidden focus target mounts.
 */
export type CellElementsRegistry = {
  registerContainer: (rowIndex: number, colIndex: number, element: HTMLElement | null) => void;
  registerFocusTarget: (rowIndex: number, colIndex: number, element: HTMLInputElement | null) => void;
  getContainer: (rowIndex: number, colIndex: number) => HTMLElement | undefined;
  getFocusTarget: (rowIndex: number, colIndex: number) => HTMLInputElement | undefined;
  /** Focuses the cell's hidden focus target: right away when it is mounted, otherwise as soon as it mounts. */
  focus: (rowIndex: number, colIndex: number) => void;
};

const toKey = (rowIndex: number, colIndex: number) => `${rowIndex} ${colIndex}`;

const register = <TElement>(
  elements: Map<string, TElement>,
  rowIndex: number,
  colIndex: number,
  element: TElement | null
) => {
  if (element) {
    elements.set(toKey(rowIndex, colIndex), element);
  } else {
    elements.delete(toKey(rowIndex, colIndex));
  }
};

export const createCellElementsRegistry = (): CellElementsRegistry => {
  const containers = new Map<string, HTMLElement>();
  const focusTargets = new Map<string, HTMLInputElement>();
  let pendingFocus: IndexedLocation | undefined;

  return {
    registerContainer: (rowIndex, colIndex, element) => register(containers, rowIndex, colIndex, element),

    registerFocusTarget: (rowIndex, colIndex, element) => {
      register(focusTargets, rowIndex, colIndex, element);

      if (!element || pendingFocus?.rowIndex !== rowIndex || pendingFocus?.colIndex !== colIndex) return;

      pendingFocus = undefined;
      // Registration happens while React commits the mount, so the focus (and the focus event it dispatches) waits for the commit to finish.
      queueMicrotask(() => element.isConnected && element.focus({ preventScroll: true }));
    },

    getContainer: (rowIndex, colIndex) => containers.get(toKey(rowIndex, colIndex)),

    getFocusTarget: (rowIndex, colIndex) => focusTargets.get(toKey(rowIndex, colIndex)),

    focus: (rowIndex, colIndex) => {
      const focusTarget = focusTargets.get(toKey(rowIndex, colIndex));

      if (!focusTarget) {
        pendingFocus = { rowIndex, colIndex };
        return;
      }

      pendingFocus = undefined;
      focusTarget.focus({ preventScroll: true });
    },
  };
};
