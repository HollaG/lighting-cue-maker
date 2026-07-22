import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";
import { api } from "../../lib/api";
import { generateRaw, generateRich } from "../../utils/convertText";
import { getCueOrder } from "../../utils/cueUtils";
import type { Cue } from "../../types/cues";
import type {
  GetCuesRes,
  CreateCueRes,
  UpdateItemRes,
  DeleteCuesRes,
  UpdateCueReq,
  UpdateCueRes,
} from "../../types/http";
import { convertUuidForEmbedding } from "../../utils/convertUuid";

export interface CueSlice {
  cues: Cue[];
  cueOrder: string[];
  currentlySelectedCueId: string | undefined;
  setCurrentlySelectedCueId: (cueId: string | undefined) => void;
  getCue: (cueId: string) => Cue | undefined;
  fetchCues: () => Promise<void>;
  onAddCue: (lineIndex: number, wordIndex: number, isSpace: boolean) => Promise<void>;
  onDeleteCue: (cueId: string) => Promise<void>;
  onUpdateCue: (cue: Cue) => Promise<void>;
}

export const createCueSlice: StateCreator<AppStore, [], [], CueSlice> = (set, get) => ({
  cues: [],
  currentlySelectedCueId: undefined,
  setCurrentlySelectedCueId: (cueId) => {
    console.log(cueId);
    set({ currentlySelectedCueId: cueId });
  },
  cueOrder: [],

  getCue: (cueId: string) => get().cues.find((cue) => cue.id === cueId),

  fetchCues: async () => {
    const { event, activeItem, isValidEvent } = get();
    if (!event?.id || !activeItem?.id || !isValidEvent) {
      set({ cues: [], cueOrder: [] });
      return;
    }
    const targetItemId = activeItem.id;
    try {
      const res = await api.get<GetCuesRes>(`/api/v1/events/${event.id}/items/${targetItemId}/cues`);
      // Guard against race conditions if user selected a different item while fetching
      if (get().activeItem?.id !== targetItemId) return;
      const fetchedCues = res?.cues ?? [];
      set({
        cues: fetchedCues,
        cueOrder: getCueOrder(get().rawLyrics),
      });
    } catch {
      if (get().activeItem?.id === targetItemId) {
        set({ cues: [], cueOrder: [] });
      }
    }
  },

  onAddCue: async (lineIndex: number, wordIndex: number, isSpace: boolean) => {
    const { event, activeItem, content, setContent, fetchCues } = get();
    if (!event?.id || !activeItem?.id) return;

    try {
      const res = await api.post<CreateCueRes>(`/api/v1/events/${event.id}/items/${activeItem.id}/cues`, {});
      const id = res.cue.id;

      const updatedContent = [...content.map((line) => [...line])];

      if (isSpace) {
        const cueId = "<cueId=" + id.replaceAll("-", "_") + "=cueId>";
        updatedContent[lineIndex][wordIndex] = cueId;

        // works because (1) tapping on space, which is the only content in the line
        const isLineBreak = updatedContent[lineIndex].length === 1;

        const line = updatedContent[lineIndex];

        line.splice(wordIndex + 1, 0, " ");
        line.splice(wordIndex, 0, " ");
        updatedContent[lineIndex] = line;

        if (isLineBreak) {
          updatedContent.splice(lineIndex + 1, 0, [" "]);
          updatedContent.splice(lineIndex, 0, [" "]);
        }
      } else {
        const cueId = "<cueId=" + id.replaceAll("-", "_") + "=cueId>" + updatedContent[lineIndex][wordIndex];
        updatedContent[lineIndex][wordIndex] = cueId;
      }

      setContent(updatedContent);

      const newRawLyrics = generateRaw(updatedContent);
      set({
        rawLyrics: newRawLyrics,
        cueOrder: getCueOrder(newRawLyrics),
      });

      await api.patch<UpdateItemRes>(`/api/v1/events/${event.id}/items/${activeItem.id}`, { rawLyrics: newRawLyrics });

      await fetchCues();
    } catch (e) {}
  },

  onUpdateCue: async (updatedCue: Cue) => {
    const requestBody: UpdateCueReq = {
      comments: updatedCue.comments,
      assignments: updatedCue.assignments,
    };
    const { event, activeItem } = get();
    if (!event?.id || !activeItem?.id) return;
    await api.patch<UpdateCueRes>(
      `/api/v1/events/${event.id}/items/${activeItem.id}/cues/${updatedCue.id}`,
      requestBody,
    );
    await get().fetchCues();
  },

  onDeleteCue: async (cueId: string) => {
    // remove from rawLyrics, remove from state's cues, update cues in database
    const { event, activeItem, rawLyrics } = get();
    if (!event?.id || !activeItem?.id) return;

    const newRawLyrics = rawLyrics.replace("<cueId=" + convertUuidForEmbedding(cueId) + "=cueId>", "");

    await api.delete<DeleteCuesRes>(`/api/v1/events/${event.id}/items/${activeItem.id}/cues/${cueId}`);
    await get().fetchCues();
    set({ rawLyrics: newRawLyrics, cueOrder: getCueOrder(newRawLyrics), content: generateRich(newRawLyrics) });
  },
});
