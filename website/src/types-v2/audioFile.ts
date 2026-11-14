import type { Timestamps } from "./common";

export const FileStatus = {
  /** Reserved for a later direct-to-storage upload flow; uploads through the server are READY straight away. */
  PENDING: "PENDING",
  READY: "READY",
} as const;
export type FileStatus = (typeof FileStatus)[keyof typeof FileStatus];

/**
 * One uploaded audio file of an item (its "library"). Placing it on the timeline creates a TimelineAudio clip.
 * Keep in sync with AudioFile in server/internal/models/v2/audio_file.go.
 */
export type AudioFile = Timestamps & {
  id: string;
  /** The item it was uploaded for; only that item's timeline can use it. */
  uploaderItemId: string;
  eventId: string;

  /** The name the file had on the user's computer. */
  fileName: string;
  /** Detected by the server from the file's contents. */
  mimeType: string;
  sizeBytes: number;
  durationMs: number;

  status: FileStatus;
};

/** An AudioFile plus a read-only link to play it. */
export type AudioFileWithUrl = AudioFile & {
  /** Usable directly as `<audio src>`. Expires at `urlExpiresAt` (1–2 hours after it was issued). */
  url: string;
  /** ISO date. */
  urlExpiresAt: string;
};
