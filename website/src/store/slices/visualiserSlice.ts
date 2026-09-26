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
  history: HistoryEntry[];
  historyPointer: number;
  // addHistory: (history: HistoryEntry) => void;
  addFixtureUpdateHistory: (fixture: UpsertFixtureReq) => void;
  add3DObjectHistory: (objects3D: Visualiser3DObject[]) => void;

  // internal
  addHistory: (history: HistoryEntry) => void;
  undoHistory: () => HistoryEntry;
  redoHistory: () => HistoryEntry;
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
  addFixtureUpdateHistory: (fixture: UpsertFixtureReq) => {
    get().addHistory({ fixtureEntry: { type: "update", fixture } });
  },
  add3DObjectHistory: (objects3D: Visualiser3DObject[]) => {
    get().addHistory({ objects3D });
  },
  addHistory: (entry: HistoryEntry) => {
    // A new edit after undo replaces the remaining redo history.
    set((state) => ({
      history: [...state.history.slice(0, state.historyPointer + 1), entry],
      historyPointer: state.historyPointer + 1,
    }));

    console.log(
      `[history] Added history entry ${JSON.stringify(entry)}. New pointer: ${get().historyPointer}. History length: ${get().history.length}`,
    );
  },
  undoHistory: () => {
    const history = get().history[get().historyPointer] ?? { objects3D: [], fixture: [] };
    set((state) => ({
      historyPointer: Math.max(0, state.historyPointer - 1),
    }));
    return history;
  },
  redoHistory: () => {
    const history = get().history[get().historyPointer + 1] ?? { objects3D: [], fixture: [] };
    set((state) => ({
      historyPointer: Math.min(state.history.length - 1, state.historyPointer + 1),
    }));
    return history;
  },
});

// const diffStates = (prev: Visualiser3D)
