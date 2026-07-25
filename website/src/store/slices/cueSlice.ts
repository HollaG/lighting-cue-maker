import type { StateCreator } from "zustand";
import type { AppStore } from "../appStore";
import { api } from "../../lib/api";
import { generateRaw } from "../../utils/convertText";
import type { CreateCueRes, UpdateItemRes, DeleteCuesRes, UpdateCueReq, UpdateCueRes } from "../../types/http";
import { convertUuidForEmbedding } from "../../utils/convertUuid";
import type { Cue } from "../../types/cues";
import type { GetCuesRefetchFn } from "../../query/useGetCues";
import type { GetItemRefetchFn } from "../../query/useGetItem";

export interface CueSlice {
  currentlySelectedCueId: string | undefined;
  setCurrentlySelectedCueId: (cueId: string | undefined) => void;
  onAddCue: (
    lineIndex: number,
    wordIndex: number,
    isSpace: boolean,
    content: string[][],
    refetchItem: GetItemRefetchFn,
    refetchCues: GetCuesRefetchFn,
  ) => Promise<void>;
  onDeleteCue: (
    cueId: string,
    rawLyrics: string,
    refetchItem: GetItemRefetchFn,
    refetchCues: GetCuesRefetchFn,
  ) => Promise<void>;
  onUpdateCue: (cue: Cue, refetchItem: GetItemRefetchFn, refetchCues: GetCuesRefetchFn) => Promise<void>;
}

export const cueSlice: StateCreator<AppStore, [], [], CueSlice> = (set, get) => ({
  currentlySelectedCueId: undefined,
  setCurrentlySelectedCueId: (cueId) => {
    console.log(cueId);
    set({ currentlySelectedCueId: cueId });
  },

  onAddCue: async (
    lineIndex: number,
    wordIndex: number,
    isSpace: boolean,
    content: string[][],
    refetchItem: GetItemRefetchFn,
    refetchCues: GetCuesRefetchFn,
  ) => {
    const { activeItemId } = get();
    if (!activeItemId || !content) return;

    try {
      const res = await api.post<CreateCueRes>(`/api/v1/cues`, { itemId: activeItemId });
      const id = res.cue.id;

      const updatedContent = [...content.map((line) => [...line])];

      if (isSpace) {
        const cueId = "<cueId=" + id.replaceAll("-", "_") + "=cueId>";
        updatedContent[lineIndex][wordIndex] = cueId;

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

      const newRawLyrics = generateRaw(updatedContent);

      await api.patch<UpdateItemRes>(`/api/v1/items/${activeItemId}`, { rawLyrics: newRawLyrics });

      refetchCues();
      refetchItem();
    } catch (e) {}
  },

  onUpdateCue: async (updatedCue: Cue, refetchItem: GetItemRefetchFn, refetchCues: GetCuesRefetchFn) => {
    const requestBody: UpdateCueReq = {
      comments: updatedCue.comments,
      assignments: updatedCue.assignments,
    };
    const { activeItemId } = get();
    if (!activeItemId) return;
    await api.patch<UpdateCueRes>(`/api/v1/cues/${updatedCue.id}`, requestBody);

    refetchCues();
    refetchItem();
  },

  onDeleteCue: async (
    cueId: string,
    rawLyrics: string,
    refetchItem: GetItemRefetchFn,
    refetchCues: GetCuesRefetchFn,
  ) => {
    const { activeItemId } = get();
    if (!activeItemId) return;

    const newRawLyrics = rawLyrics.replace("<cueId=" + convertUuidForEmbedding(cueId) + "=cueId>", "");

    await api.delete<DeleteCuesRes>(`/api/v1/cues/${cueId}`);
    await api.patch<UpdateItemRes>(`/api/v1/items/${activeItemId}`, { rawLyrics: newRawLyrics });

    refetchCues();
    refetchItem();
  },
});
