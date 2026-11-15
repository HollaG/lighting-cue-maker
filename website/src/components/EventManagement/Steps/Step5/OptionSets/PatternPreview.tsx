import { Alert, Box, Tooltip } from "@mantine/core";
import { useEffect, useMemo, useRef } from "react";
import { cellKey, createPatternTrack, type PatternTrack } from "../../../../../effects/pattern/patternPlayer";
import { getPatternEffect } from "../../../../../effects/pattern/registry";
import { runEffectFrames } from "../../../../../effects/effectFrames";
import type { Grid, GridCell } from "../../../../../types-v2/fixtureGroups";
import type { PatternSelectable } from "../../../../../types-v2/optionSet";
import type { PatchedFixture } from "../../../../../types-v2/patchedFixture";

/** Largest a cell gets, so a small grid doesn't fill the whole modal. */
const MAX_CELL_PX = 80;

/**
 * Animated preview of one pattern selectable on its fixture group's grid (set up in step 2),
 * like QLC+'s RGB matrix preview. Shows the effect's own colours only: no blend mode, no static values.
 */
export const PatternPreview = ({
  selectable,
  grid,
  fixtures,
}: {
  selectable: PatternSelectable;
  grid: Grid | null;
  /** For the cell tooltips. */
  fixtures: PatchedFixture[];
}) => {
  const hasCells = !!grid && grid.cells.length > 0;
  const effect = getPatternEffect(selectable.effect);

  // The same compiled pattern the visualiser plays. Null if the effect throws while compiling.
  const track = useMemo((): PatternTrack | null => {
    if (!effect || !grid || !hasCells) return null;
    try {
      return createPatternTrack(effect, selectable, grid);
    } catch (error) {
      console.warn(`Pattern effect "${effect.id}" threw in the preview`, error);
      return null;
    }
  }, [effect, selectable, grid, hasCells]);

  // Cells the pattern colours, by cellKey. Painted directly each frame, not through React state.
  const cellElements = useRef(new Map<string, HTMLElement>());
  // Restart from 0 when the timing changes; other edits (colours, params) keep the preview running.
  const resetKey = `${selectable.effect}|${selectable.stepDuration}|${selectable.fadeInDuration}|${selectable.fadeOutDuration}`;
  const clock = useRef<{ resetKey: string; startedAt: number } | null>(null);

  useEffect(() => {
    if (!track) return;
    if (clock.current?.resetKey !== resetKey) clock.current = { resetKey, startedAt: performance.now() };

    const paint = (failed: boolean) => {
      for (const [key, element] of cellElements.current) {
        const i = track.indexByKey.get(key);
        element.style.background =
          failed || i === undefined
            ? "black"
            : `rgb(${track.rgb[i * 3]}, ${track.rgb[i * 3 + 1]}, ${track.rgb[i * 3 + 2]})`;
      }
    };

    let painted = false;
    let warned = false;
    return runEffectFrames(
      track.nextChangeDelay,
      (timeMs) => {
        try {
          if (track.evaluate(timeMs) || !painted) paint(false);
        } catch (error) {
          if (!warned) console.warn(`Pattern effect "${selectable.effect}" threw in the preview`, error);
          warned = true;
          paint(true);
        }
        painted = true;
      },
      clock.current.startedAt,
    );
  }, [track, resetKey, selectable.effect]);

  const cellByPosition = useMemo(() => new Map((grid?.cells ?? []).map((c) => [cellKey(c.col, c.row), c])), [grid]);
  const fixtureNameById = useMemo(() => new Map(fixtures.map((f) => [f.id, f.name])), [fixtures]);

  if (!grid || !hasCells) {
    return (
      <Alert variant="light" color="yellow" title="No grid to preview">
        This fixture group has no heads on its grid yet. Place them in the Grid section of step 2 to preview effects.
      </Alert>
    );
  }
  if (!effect) {
    return (
      <Alert variant="light" color="red" title="Unknown effect">
        The effect "{selectable.effect}" no longer exists. Pick another one.
      </Alert>
    );
  }

  const isAffected = (cell: GridCell) => selectable.fixtureIds === "all" || selectable.fixtureIds.includes(cell.fixtureId);

  return (
    <Box bg="black" p={4} style={{ borderRadius: "var(--mantine-radius-sm)" }}>
      <Box
        mx="auto"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
          gap: 2,
          // Square cells, no bigger than MAX_CELL_PX, and the whole grid no taller than half the screen.
          width: `min(100%, ${grid.cols * MAX_CELL_PX}px, calc(50vh * ${grid.cols / grid.rows}))`,
        }}
      >
        {Array.from({ length: grid.rows * grid.cols }, (_, index) => {
          const col = index % grid.cols;
          const row = Math.floor(index / grid.cols);
          const cell = cellByPosition.get(cellKey(col, row));

          if (!cell) {
            // No head here: just an outline, so the grid shape is still visible.
            return (
              <Box
                key={index}
                style={{ aspectRatio: "1", border: "1px dashed var(--mantine-color-dark-4)" }}
              />
            );
          }

          const key = cellKey(col, row);
          const affected = isAffected(cell);
          const fixtureName = fixtureNameById.get(cell.fixtureId) ?? "Unknown fixture";
          return (
            <Tooltip key={index} label={`${fixtureName} · head ${cell.head + 1}`} openDelay={300}>
              <Box
                ref={(element: HTMLDivElement | null) => {
                  if (element && affected) cellElements.current.set(key, element);
                  else cellElements.current.delete(key);
                }}
                style={{
                  aspectRatio: "1",
                  background: "black",
                  border: "1px solid var(--mantine-color-dark-4)",
                }}
              />
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
};
