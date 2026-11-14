import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import type { AudioFileWithUrl } from "../../types-v2/audioFile";
import { audioFilesUrl, makeGetAudioFilesQueryKey } from "./useGetAudioFiles";

// Keep in sync with upload in server/internal/api/v2/audiofiles/handler.go.
export type UploadAudioFileRes = {
  audioFile: AudioFileWithUrl;
};

/**
 * Reads an audio file's length with the browser's own decoder (the server can't without parsing audio).
 * Only the metadata is read, not the whole file. Rejects if the browser can't play the file.
 */
export const readAudioDurationMs = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = () => {
      audio.removeAttribute("src");
      URL.revokeObjectURL(url);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      const seconds = audio.duration;
      done();
      if (Number.isFinite(seconds) && seconds > 0) resolve(Math.round(seconds * 1000));
      else reject(new Error(`Couldn't read the length of "${file.name}"`));
    };
    audio.onerror = () => {
      done();
      reject(new Error(`"${file.name}" isn't an audio file this browser can play`));
    };
    audio.src = url;
  });

/**
 * Uploads ONE audio file to the item's library (it isn't placed on the timeline: add a TimelineAudio clip for that).
 * Reads the file's duration first, then sends `durationMs` + `file` as multipart/form-data.
 * For several files, call it once per file (e.g. 2–3 at a time) so each file succeeds or fails on its own.
 *
 * The server checks size (50 MB), format (MP3, M4A/AAC, OGG/Opus, WAV, FLAC) and length (30 min) and rejects with a
 * message, which the api helper shows as a notification.
 */
export const useUploadAudioFile = (eventId: string, itemId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // If the browser can't read the file, this rejects before anything is sent. That's not a server error, so
      // the api helper won't show it: the caller should (e.g. next to the file in the upload list).
      const durationMs = await readAudioDurationMs(file);

      const form = new FormData();
      // durationMs must come before file: the server reads the parts in order.
      form.append("durationMs", String(durationMs));
      form.append("file", file);
      const res = await api.postForm<UploadAudioFileRes>(audioFilesUrl(eventId, itemId), form);
      return res.audioFile;
    },

    onSuccess: (audioFile) => {
      // The list is oldest first: append (or replace, if somehow already there).
      queryClient.setQueryData<AudioFileWithUrl[]>(makeGetAudioFilesQueryKey(eventId, itemId), (prev) => {
        if (!prev) return prev;
        return prev.some((f) => f.id === audioFile.id)
          ? prev.map((f) => (f.id === audioFile.id ? audioFile : f))
          : [...prev, audioFile];
      });
    },
  });
};
