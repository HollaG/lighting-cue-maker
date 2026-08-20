import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";

export interface VisualiserSlice {
  // --- Scope: EditVisualisation ---
  activeObjectId: string | null; // which object is selected in the preview
  isSelected: (id: string) => boolean; // whether the given id is `activeObject`
  setActiveObjectId: (id: string | null) => void; // set the active object id (for selection)

  previewFixtureId: string | null; // which fixture we are currently editing the position mappings of
  setPreviewFixtureId: (id: string | null) => void; // set the fixture we are currently editing the position mappings of
  isPreviewingFixture: (id: string) => boolean; // whether the given fixture id is the one we are currently editing the position mappings of

  // special attribute: Position
  previewPositionId: string | null; // which position we are currently editing the position mappings of
  position: { pan: number; tilt: number } | null; // the position we are currently editing the position mappings of
  togglePreviewPositionId: (id: string | null, position?: { pan: number; tilt: number }) => void; // set the position we are currently editing the position mappings of
  setPreviewPosition: (id: string | null, position?: { pan?: number; tilt?: number }) => void; // set the position we are currently editing the position mappings of
}

export const visualiserSlice: StateCreator<AppStore, [], [], VisualiserSlice> = (set, get) => ({
  activeObjectId: null,
  setActiveObjectId: (id: string | null) => set({ activeObjectId: id }),

  previewFixtureId: null,
  setPreviewFixtureId: (id: string | null) => set({ previewFixtureId: id }),
  isPreviewingFixture: (id: string) => {
    return get().previewFixtureId === id && get().previewFixtureId !== null;
  },

  isSelected: (id: string) => {
    return get().activeObjectId === id;
  },

  previewPositionId: null,
  position: null,
  togglePreviewPositionId: (id: string | null, position?: { pan: number; tilt: number }) => {
    // if not set, set, if set, unset
    if (get().previewPositionId === id) {
      set({ previewPositionId: null, position: null });
    } else {
      set({ previewPositionId: id, position });
    }
  },
  setPreviewPosition: (positionId: string | null, position?: { pan?: number; tilt?: number }) => {
    if (positionId !== get().previewPositionId) {
      return; // ignore if the fixture whos position option is being edited is NOT the preview fixture
    }

    set((state) => ({
      previewPositionId: positionId,
      position: {
        pan: position?.pan ?? state.position?.pan ?? 0,
        tilt: position?.tilt ?? state.position?.tilt ?? 0,
      },
    }));
  },
});
