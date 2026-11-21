import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { AudioFileWithUrl } from "../../types-v2/audioFile";
import { computePeaks, type Peaks } from "../../utils/waveform";
import { Logger } from "../../utils/logger";

const logger = new Logger("useDecodedAudio", "orange");

/**
 * Downloads and decodes each audio file once, shared by playback and the waveforms.
 *
 * - `getBuffer(file)`: the decoded AudioBuffer, for playback. Concurrent calls for one file share one download.
 * - `peaksByFileId`: waveform peaks, filled in as files finish decoding. The files used by `fileIds` start decoding
 *   as soon as the timeline mounts, not on the first Play.
 *
 * Files are cached by id for the timeline's lifetime (a SAS URL can expire; the id can't).
 */
export const useDecodedAudio = (
  audioCtx: RefObject<AudioContext | null>,
  audioFiles: AudioFileWithUrl[],
  /** Files the clips use: these are decoded straight away for their waveforms. */
  fileIds: string[],
) => {
  const buffers = useRef(new Map<string, Promise<AudioBuffer>>());
  const [peaksByFileId, setPeaksByFileId] = useState<ReadonlyMap<string, Peaks>>(new Map());

  const getBuffer = useCallback(
    (file: AudioFileWithUrl): Promise<AudioBuffer> => {
      const cached = buffers.current.get(file.id);
      if (cached) return cached;

      const ctx = audioCtx.current;
      if (!ctx) return Promise.reject(new Error("AudioContext not created yet"));

      const promise = (async () => {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(`Audio download failed: ${res.status}`);
        return ctx.decodeAudioData(await res.arrayBuffer());
      })();
      // Forget a failed download, so the next Play or waveform load tries again.
      promise.catch(() => buffers.current.delete(file.id));
      buffers.current.set(file.id, promise);
      return promise;
    },
    [audioCtx],
  );

  // Decode the clips' files for their waveforms. The key keeps this from re-running on every timeline edit.
  const fileIdsKey = [...new Set(fileIds)].sort().join(",");
  useEffect(() => {
    let cancelled = false;
    for (const id of fileIdsKey ? fileIdsKey.split(",") : []) {
      const file = audioFiles.find((f) => f.id === id);
      if (!file) continue;
      getBuffer(file)
        .then((buffer) => {
          if (cancelled) return;
          setPeaksByFileId((prev) => (prev.has(id) ? prev : new Map(prev).set(id, computePeaks(buffer))));
        })
        .catch((e) => logger.warn("Failed to load waveform", { fileId: id, e }));
    }
    return () => {
      cancelled = true;
    };
    // audioFiles is read only to find each file's URL; its identity changes on every refetch.
  }, [fileIdsKey, getBuffer]); // eslint-disable-line react-hooks/exhaustive-deps

  return { getBuffer, peaksByFileId };
};
