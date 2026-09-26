import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";
import type { PositionOption, UpsertFixtureReq } from "../../types/fixtures";
import type { Visualiser3DObject } from "../../types/visualiser3d";

export type VisualiserTransformMode = "translate" | "rotate" | "scale";

type FixtureHistoryEntry = {
  type: "update" | "delete" | "create"; // TODO: only undoing updates supported for now
  fixture: UpsertFixtureReq;
};

/**
 * Records a change to 3D objects, a fixture, or both.
 * At least one must be present; fixture updates contain only the changed fields.
 */
export type HistoryEntry =
  | {
      objects3D: Visualiser3DObject[];
      fixtureEntry?: FixtureHistoryEntry;
    }
  | {
      objects3D?: Visualiser3DObject[];
      fixtureEntry: FixtureHistoryEntry;
    };

type HistoryChange = {
  before: HistoryEntry;
  after: HistoryEntry;
};

const MAX_HISTORY_ENTRIES = 250;

export interface VisualiserSlice {
  // --- Scope: EditVisualisation ---
  activeObjectId: string | null; // which object is selected in the preview
  isSelected: (id: string) => boolean; // whether the given id is `activeObject`
  setActiveObjectId: (id: string | null) => void; // set the active object id (for selection)

  transformMode: VisualiserTransformMode;
  setTransformMode: (mode: VisualiserTransformMode) => void;

  previewFixtureId: string | null; // which fixture we are currently editing the position mappings of
  setPreviewFixtureId: (id: string | null) => void; // set the fixture we are currently editing the position mappings of
  isPreviewingFixture: (id: string) => boolean; // whether the given fixture id is the one we are currently editing the position mappings of

  // special attribute: Position
  previewPositionId: string | null; // which position we are currently editing the position mappings of
  previewPosition: PositionOption | null; // the position we are currently editing the position mappings of
  togglePreviewPositionId: (id: string | null, position?: PositionOption) => void; // set the position we are currently editing the position mappings of
  setPreviewPosition: (id: string | null, position?: Partial<PositionOption>) => void; // set the position we are currently editing the position mappings of

  // for Undo visualiser movements
  // save the history
  history: HistoryChange[];
  // Index of the last applied change; -1 means every change has been undone.
  historyPointer: number;
  addFixtureUpdateHistory: (before: UpsertFixtureReq, after: UpsertFixtureReq) => void;
  add3DObjectHistory: (before: Visualiser3DObject[], after: Visualiser3DObject[]) => void;

  // internal
  addHistory: (change: HistoryChange) => void;
  getUndo: () => HistoryEntry | null;
  getRedo: () => HistoryEntry | null;

  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const visualiserSlice: StateCreator<AppStore, [], [], VisualiserSlice> = (set, get) => ({
  activeObjectId: null,
  setActiveObjectId: (id: string | null) => set({ activeObjectId: id }),

  transformMode: "translate",
  setTransformMode: (mode) => set({ transformMode: mode }),

  previewFixtureId: null,
  setPreviewFixtureId: (id: string | null) => set({ previewFixtureId: id }),
  isPreviewingFixture: (id: string) => {
    return get().previewFixtureId === id && get().previewFixtureId !== null;
  },

  isSelected: (id: string) => {
    return get().activeObjectId === id;
  },

  previewPositionId: null,
  previewPosition: null,
  togglePreviewPositionId: (id: string | null, position?: { pan: number; tilt: number }) => {
    // if not set, set, if set, unset
    if (get().previewPositionId === id) {
      set({ previewPositionId: null, previewPosition: null });
    } else {
      set({ previewPositionId: id, previewPosition: position });
    }
  },
  setPreviewPosition: (positionId: string | null, position?: { pan?: number; tilt?: number }) => {
    if (positionId !== get().previewPositionId) {
      return; // ignore if the fixture whos position option is being edited is NOT the preview fixture
    }

    set((state) => ({
      previewPositionId: positionId,
      previewPosition: {
        pan: position?.pan ?? state.previewPosition?.pan ?? 0,
        tilt: position?.tilt ?? state.previewPosition?.tilt ?? 0,
      },
    }));
  },

  history: [],
  historyPointer: -1,
  addFixtureUpdateHistory: (before, after) => {
    get().addHistory({
      before: { fixtureEntry: { type: "update", fixture: before } },
      after: { fixtureEntry: { type: "update", fixture: after } },
    });
  },
  add3DObjectHistory: (before, after) => {
    get().addHistory({ before: { objects3D: before }, after: { objects3D: after } });
  },
  addHistory: (change) => {
    set((state) => {
      // A new edit replaces redo entries. Drop the oldest entry once the cap is reached.
      const history = [...state.history.slice(0, state.historyPointer + 1), structuredClone(change)].slice(
        -MAX_HISTORY_ENTRIES,
      );
      return { history, historyPointer: history.length - 1 };
    });
  },
  getUndo: () => {
    const { history, historyPointer } = get();
    const change = history[historyPointer];
    if (!change) return null;

    set({ historyPointer: historyPointer - 1 });
    return structuredClone(change.before);
  },
  getRedo: () => {
    const { history, historyPointer } = get();
    const change = history[historyPointer + 1];
    if (!change) return null;

    set({ historyPointer: historyPointer + 1 });
    return structuredClone(change.after);
  },
  canUndo: () => {
    const { history, historyPointer } = get();
    return historyPointer >= 0 && historyPointer < history.length;
  },
  canRedo: () => {
    const { history, historyPointer } = get();
    return historyPointer >= -1 && historyPointer < history.length - 1;
  },
});

// const diffStates = (prev: Visualiser3D)
