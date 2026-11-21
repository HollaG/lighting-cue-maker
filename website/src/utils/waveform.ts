/**
 * Waveform peaks for the timeline's audio clips (display only: playback uses the AudioBuffer itself).
 *
 * The audio is reduced once per file to the min and max sample of every `blockMs` block (all channels together).
 */

/** Length of one peak block, in ms. */
export const PEAK_BLOCK_MS = 5;

export type Peaks = {
  /** Lowest sample in each block, -1..1. */
  min: Float32Array;
  /** Highest sample in each block, -1..1. */
  max: Float32Array;
  blockMs: number;
  /** 1 / the loudest absolute sample in the file, so quiet files still fill the clip's height. */
  scale: number;
};

/** Reduce a decoded file to per-block min/max peaks. Runs once per file (~tens of ms for a song). */
export const computePeaks = (buffer: AudioBuffer, blockMs = PEAK_BLOCK_MS): Peaks => {
  const samplesPerBlock = Math.max(1, Math.round((buffer.sampleRate * blockMs) / 1000));
  const blockCount = Math.ceil(buffer.length / samplesPerBlock);
  const min = new Float32Array(blockCount).fill(1);
  const max = new Float32Array(blockCount).fill(-1);

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let block = 0; block < blockCount; block++) {
      const end = Math.min(data.length, (block + 1) * samplesPerBlock);
      let lo = min[block];
      let hi = max[block];
      for (let i = block * samplesPerBlock; i < end; i++) {
        const sample = data[i];
        if (sample < lo) lo = sample;
        if (sample > hi) hi = sample;
      }
      min[block] = lo;
      max[block] = hi;
    }
  }

  let loudest = 0;
  for (let block = 0; block < blockCount; block++) {
    loudest = Math.max(loudest, Math.abs(min[block]), Math.abs(max[block]));
  }

  // The real block length, not the requested one: samplesPerBlock is rounded to whole samples (at 44.1 kHz, 5 ms is
  // 220.5 → 221 samples = 5.0113 ms), and drawing with the nominal 5 ms made the waveform drift ahead over a song.
  const actualBlockMs = (samplesPerBlock * 1000) / buffer.sampleRate;

  return { min, max, blockMs: actualBlockMs, scale: loudest > 0 ? 1 / loudest : 1 };
};

/**
 * Draw `fromMs`..`toMs` of the file (file time, not timeline time) across the whole canvas, one vertical line per
 * device pixel. The canvas's backing size must already be set; `color` is any canvas colour string.
 */
export const drawPeaks = (canvas: HTMLCanvasElement, peaks: Peaks, fromMs: number, toMs: number, color: string) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  if (width === 0 || height === 0 || toMs <= fromMs) return;

  const mid = height / 2;
  const msPerPx = (toMs - fromMs) / width;
  const blockCount = peaks.min.length;

  ctx.fillStyle = color;
  for (let x = 0; x < width; x++) {
    // The blocks this pixel covers. Zoomed in past 1 block per pixel, it's just the block under the pixel.
    const first = Math.floor((fromMs + x * msPerPx) / peaks.blockMs);
    const last = Math.max(first, Math.ceil((fromMs + (x + 1) * msPerPx) / peaks.blockMs) - 1);
    if (first >= blockCount) break;
    if (last < 0) continue;

    let lo = 1;
    let hi = -1;
    for (let block = Math.max(0, first); block <= Math.min(blockCount - 1, last); block++) {
      if (peaks.min[block] < lo) lo = peaks.min[block];
      if (peaks.max[block] > hi) hi = peaks.max[block];
    }
    if (hi < lo) continue;

    const top = mid - hi * peaks.scale * mid;
    const bottom = mid - lo * peaks.scale * mid;
    ctx.fillRect(x, top, 1, Math.max(1, bottom - top)); // at least 1 px, so silence still shows a centre line
  }
};
