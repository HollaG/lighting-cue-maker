import { useTimelineContext } from "dnd-timeline";
import { useElementSize, useMergedRef } from "@mantine/hooks";
import { useLayoutEffect, useRef } from "react";
import { drawPeaks, type Peaks } from "../../utils/waveform";

/**
 * An audio clip's waveform, display only (no playback, no pointer events: drags go through to the clip).
 *
 * The clip's element is as wide as the whole clip, which can be far wider than a canvas allows when zoomed in, so
 * the canvas only covers the visible part of the clip and redraws on pan/zoom. Must sit in an element that starts at
 * the clip's start and is `position: relative`.
 */
export const TimelineWaveform = ({
  peaks,
  startTime,
  duration,
  offset,
}: {
  peaks: Peaks;
  /** Clip start on the timeline, ms. */
  startTime: number;
  /** ms the clip plays. */
  duration: number;
  /** ms into the file where the clip starts. */
  offset: number;
}) => {
  const { range, valueToPixels } = useTimelineContext();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { ref: sizeRef, height } = useElementSize<HTMLCanvasElement>();
  const ref = useMergedRef(canvasRef, sizeRef); // stable, so the resize observer isn't re-attached every render

  // The visible part of the clip, in timeline ms.
  const visibleStart = Math.max(startTime, range.start);
  const visibleEnd = Math.min(startTime + duration, range.end);
  const leftPx = valueToPixels(visibleStart - startTime);
  const widthPx = Math.max(0, valueToPixels(visibleEnd - visibleStart));

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(widthPx * dpr);
    canvas.height = Math.round(height * dpr);
    // Timeline ms → file ms: the clip plays the file from `offset`.
    const fromMs = offset + (visibleStart - startTime);
    const toMs = offset + (visibleEnd - startTime);
    drawPeaks(canvas, peaks, fromMs, toMs, getComputedStyle(canvas).color);
  }, [peaks, widthPx, height, visibleStart, visibleEnd, startTime, offset]);

  if (widthPx <= 0) return null;

  return (
    <canvas
      ref={ref}
      style={{
        position: "absolute",
        left: leftPx,
        top: 0,
        width: widthPx,
        height: "100%",
        pointerEvents: "none",
        color: "var(--mantine-primary-color-light-color)", // read back as the fill colour
        opacity: 0.6,
      }}
    />
  );
};
