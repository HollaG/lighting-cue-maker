// TODO for Grid:
// 1. Add advanced controls
//  Multi-select move
//  Rotate
//  Flip
//  Delete
// 2. Prevent making the grid size smaller if there are heads outside the new size

import {
  Box,
  Center,
  Divider,
  getDefaultZIndex,
  Group,
  Menu,
  NumberInput,
  Popover,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { CardBase, ClickableCardBase } from "../../../Cues/CardBase";
import type { FixtureGroup, GridCell } from "../../../../types-v2/fixtureGroups";
import type { PatchedFixture } from "../../../../types-v2/patchedFixture";
import { useUpsertFixtureGroups } from "../../../../query-v2/fixture-groups/useUpsertFixtureGroups";
import { useGetFixtureGroups } from "../../../../query-v2/fixture-groups/useGetFixtureGroups";
import { IconPlus } from "@tabler/icons-react";
import React, { useCallback, useMemo, useState } from "react";
import { Logger } from "../../../../utils/logger";
import { popTransition } from "../../../../utils/animations";
import type { FixtureTemplate, Head } from "../../../../types-v2/fixtureTemplates";
import { ConfirmDelete, ConfirmDeleteButton } from "../../../ConfirmDeleteButton/ConfirmDeleteButton";

const logger = new Logger("GridControl");

// TODO: come back here once done with the main flow
export const GridControl = ({
  eventId,
  fixtureGroup,
  fixtures,
  fixtureTemplates,
}: {
  eventId: string;
  fixtureGroup: FixtureGroup;
  /** Only the fixtures in this group */
  fixtures: PatchedFixture[];
  fixtureTemplates: FixtureTemplate[];
}) => {
  const { mutateAsync: upsertFixtureGroups } = useUpsertFixtureGroups(eventId);

  const grid = fixtureGroup.grid ?? { rows: 1, cols: fixtures.length, cells: [] };

  // one-time map: grid position to Group Cell
  const gridPositionToCell = useMemo(() => {
    const map = new Map<string, PatchedFixture>();
    for (const cell of grid.cells) {
      const fixture = fixtures.find((f) => f.id === cell.fixtureId);
      if (!fixture) {
        console.error(
          `Mapping grid position ${cell.row}-${cell.col} to fixture failed; no fixture found with id ${cell.fixtureId}`,
        );
        continue;
      }
      map.set(`${cell.row}-${cell.col}`, fixture);
    }

    logger.info(`Mapped ${map.size} grid positions to fixtures`, map);

    return map;
  }, [grid.cells, fixtures]);

  /** Add the selected heads to the database */
  const onAddHeads = (gridCells: GridCell[]) => {
    upsertFixtureGroups([{ ...fixtureGroup, grid: { ...grid, cells: dedupeCells([...grid.cells, ...gridCells]) } }]);
  };

  /** Remove the cells at these grid positions. Returns the save, so ConfirmDelete can show loading / stay open on error. */
  const onRemoveCells = (positions: SimpleGridCell[]) =>
    upsertFixtureGroups([
      {
        ...fixtureGroup,
        grid: {
          ...grid,
          cells: dedupeCells(grid.cells.filter((c) => !positions.some((p) => p.row === c.row && p.col === c.col))),
        },
      },
    ]);

  const [selectedCells, setSelectedCells] = useState<SimpleGridCell[]>([]);
  const addToSelection = (cell: SimpleGridCell) => {
    setSelectedCells((prev) => {
      if (prev.some((c) => c.row === cell.row && c.col === cell.col)) return prev; // already selected
      return [...prev, cell];
    });
  };
  const removeFromSelection = (cell: SimpleGridCell) => {
    setSelectedCells((prev) => prev.filter((c) => !(c.row === cell.row && c.col === cell.col)));
  };
  const clearSelection = () => {
    setSelectedCells([]);
  };

  return (
    <CardBase isActive={false}>
      <Stack gap="xs">
        <Group>
          <Title order={5} flex={1}>
            Grid{" "}
          </Title>
          <Group gap="xs">
            <Text> Rows </Text>
            <Box style={{ width: "4rem" }}>
              <NumberInput
                value={fixtureGroup.grid?.rows ?? 1}
                min={1}
                onChange={(v) => {
                  upsertFixtureGroups([{ ...fixtureGroup, grid: { ...grid, rows: Number(v) ?? 1 } }]);
                }}
              />
            </Box>
            <Text> x Cols </Text>
            <Box style={{ width: "4rem" }}>
              <NumberInput
                value={fixtureGroup.grid?.cols ?? fixtures.length}
                onChange={(v) => {
                  upsertFixtureGroups([{ ...fixtureGroup, grid: { ...grid, cols: Number(v) ?? 1 } }]);
                }}
                min={1}
              />
            </Box>
          </Group>
        </Group>
        <Text c="dimmed" fz="sm">
          Used to apply effect patterns. Don't bother if you don't need accurate visualisations for dynamic
          effects.{" "}
        </Text>
        <Divider />
        <Text> Click on a cell to add or remove a Head from that position.</Text>
        <Box
          style={{
            width: "100%",
            overflowX: "auto",
          }}
        >
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${grid.cols},75px)`,
              gap: "0.25rem",
              width: "max-content",
            }}
          >
            {Array.apply(null, Array(grid.rows * grid.cols)).map((_, cellIndex) => (
              <GridPosition
                key={`${cellIndex}`}
                row={Math.floor(cellIndex / grid.cols)}
                col={cellIndex % grid.cols}
                cell={grid.cells.find(
                  (c) => c.row === Math.floor(cellIndex / grid.cols) && c.col === cellIndex % grid.cols,
                )}
                fixture={gridPositionToCell.get(`${Math.floor(cellIndex / grid.cols)}-${cellIndex % grid.cols}`)}

                onAddHeads={onAddHeads}
                onRemoveCells={onRemoveCells}

                cells={grid.cells}
                fixtures={fixtures}
                fixtureTemplates={fixtureTemplates}
                rows={grid.rows}
                cols={grid.cols}

                addToSelection={addToSelection}
                removeFromSelection={removeFromSelection}
              />
            ))}
          </Box>
        </Box>
      </Stack>
    </CardBase>
  );
};

const GridPosition = ({
  row,
  col,
  fixture,
  cell,

  onAddHeads,
  onRemoveCells,

  cells,
  fixtures,
  fixtureTemplates,
  rows,
  cols,
}: {
  row: number;
  col: number;

  // we could probably build the memory map with Cell too
  cell: GridCell | undefined;

  // todo: we can derive this from cell, but maybe it's more efficient to build a map in the parent.
  fixture: PatchedFixture | undefined; // the cell can have no fixture

  onAddHeads: (gridCells: GridCell[]) => void;
  onRemoveCells: (positions: SimpleGridCell[]) => Promise<unknown>;

  // Information for calculating what is allowed to be "added"
  cells: GridCell[];
  fixtures: PatchedFixture[];
  fixtureTemplates: FixtureTemplate[];
  rows: number;
  cols: number;

  // for selection to delete
  addToSelection: (cell: SimpleGridCell) => void;
  removeFromSelection: (cell: SimpleGridCell) => void;
}) => {
  const [popoverOpened, setPopoverOpened] = useState(false);

  // single add
  const onSingleOptionClick = (row: number, col: number, headIndex: number, fixtureId: string) => {
    // OK to assert, this option only called when no fixture
    onAddHeads([{ row, col, fixtureId, head: headIndex }]);
  };

  const onMultiOptionClick = (row: number, col: number, direction: Direction, heads: number, fixtureId: string) => {
    switch (direction) {
      case Direction.Up:
        onAddHeads(
          Array.apply(null, Array(heads)).map((_, headIndex) => ({
            row: row - headIndex,
            col,
            fixtureId,
            head: headIndex,
          })),
        );
        break;
      case Direction.Down:
        onAddHeads(
          Array.apply(null, Array(heads)).map((_, headIndex) => ({
            row: row + headIndex,
            col,
            fixtureId,
            head: headIndex,
          })),
        );
        break;
      case Direction.Left:
        onAddHeads(
          Array.apply(null, Array(heads)).map((_, headIndex) => ({
            row,
            col: col - headIndex,
            fixtureId,
            head: headIndex,
          })),
        );
        break;
      case Direction.Right:
        onAddHeads(
          Array.apply(null, Array(heads)).map((_, headIndex) => ({
            row,
            col: col + headIndex,
            fixtureId,
            head: headIndex,
          })),
        );
        break;
    }
  };

  // Construct the list of heads that can be added
  const getOptions = useCallback(() => {
    let _options: {
      // the fixture we're working with
      fixture: PatchedFixture;

      // its heads
      heads: Head[];

      // which of its heads and what index are already in the grid
      populatedHeads: GridCell[];

      // other populated grid cells, so we can calculate for the Add heads dropdown
      otherCells: GridCell[];
    }[] = [];

    for (const fixture of fixtures) {
      const template = fixtureTemplates.find((t) => t.id === fixture.fixtureTemplateId);
      if (!template) {
        console.error(`No template found for fixture ${fixture.id} (${fixture.name})`);
        continue;
      }
      const fixtureMode = template.modes.find((m) => m.id === fixture.modeId);
      if (!fixtureMode) {
        console.error(`No mode found for fixture ${fixture.id} (${fixture.name})`);
        continue;
      }
      const heads = fixtureMode.heads;
      _options.push({
        fixture,
        heads,
        populatedHeads: cells.filter((c) => c.fixtureId === fixture.id),
        otherCells: cells.filter((c) => c.fixtureId !== fixture.id),
      });
    }

    logger.info(`Calculated ${_options.length} options for adding heads`, _options);
    return _options;
  }, [cells, fixtures, fixtureTemplates]);

  // track when the popover has been opened at least once
  const [openedAlready, setOpenedAlready] = useState(false);

  // If no fixtureId, then empty cell
  if (!cell) {
    return (
      <Menu
        position="bottom"
        withArrow
        transitionProps={popTransition}
        opened={popoverOpened}
        onChange={setPopoverOpened}
        withOverlay
      >
        <Menu.Target>
          <ClickableCardBase
            style={{
              width: 75,
              height: 75,
              padding: 0,
              zIndex: popoverOpened ? getDefaultZIndex("overlay") + 1 : undefined, // make sure the popover is above the other cards
            }}
            isActive={false}
            shadow="none"

            // open a popup to ask what fixture & heads
            onClick={() => {
              setPopoverOpened(true);
              setOpenedAlready(true);
            }}
          >
            <Center>
              <IconPlus width="1rem" />
            </Center>
          </ClickableCardBase>
        </Menu.Target>
        <Menu.Dropdown>
          {(popoverOpened || openedAlready) &&
            getOptions().map((option, index) => (
              <React.Fragment key={option.fixture.id}>
                <Menu.Label> {option.fixture.name} </Menu.Label>
                {option.heads.length > 1 && (
                  <Menu.Sub>
                    <Menu.Sub.Target>
                      <Menu.Sub.Item disabled={option.populatedHeads.some((c) => c.fixtureId === option.fixture.id)}>
                        Add heads
                      </Menu.Sub.Item>
                    </Menu.Sub.Target>
                    {!option.populatedHeads.some((c) => c.fixtureId === option.fixture.id) && (
                      <Menu.Sub.Dropdown>
                        <Menu.Item
                          onClick={() =>
                            onMultiOptionClick(row, col, Direction.Right, option.heads.length, option.fixture.id)
                          }
                          disabled={
                            !canAdd(
                              { row, col },
                              Direction.Right,
                              option.heads.length,
                              { rows, cols },
                              option.otherCells,
                            )
                          }
                        >
                          Add {option.heads.length} heads to the right
                        </Menu.Item>
                        <Menu.Item
                          onClick={() =>
                            onMultiOptionClick(row, col, Direction.Left, option.heads.length, option.fixture.id)
                          }
                          disabled={
                            !canAdd(
                              { row, col },
                              Direction.Left,
                              option.heads.length,
                              { rows, cols },
                              option.otherCells,
                            )
                          }
                        >
                          Add {option.heads.length} heads to the left
                        </Menu.Item>
                        <Menu.Item
                          onClick={() =>
                            onMultiOptionClick(row, col, Direction.Up, option.heads.length, option.fixture.id)
                          }
                          disabled={
                            !canAdd({ row, col }, Direction.Up, option.heads.length, { rows, cols }, option.otherCells)
                          }
                        >
                          Add {option.heads.length} heads upwards
                        </Menu.Item>
                        <Menu.Item
                          onClick={() =>
                            onMultiOptionClick(row, col, Direction.Down, option.heads.length, option.fixture.id)
                          }
                          disabled={
                            !canAdd(
                              { row, col },
                              Direction.Down,
                              option.heads.length,
                              { rows, cols },
                              option.otherCells,
                            )
                          }
                        >
                          Add {option.heads.length} heads downwards
                        </Menu.Item>
                      </Menu.Sub.Dropdown>
                    )}
                  </Menu.Sub>
                )}
                {option.heads.length > 1 && (
                  <Menu.Sub>
                    <Menu.Sub.Target>
                      {/* disabled once every head of this fixture is on the grid */}
                      <Menu.Sub.Item disabled={option.populatedHeads.length >= option.heads.length}>
                        Add individual heads
                      </Menu.Sub.Item>
                    </Menu.Sub.Target>
                    {option.populatedHeads.length < option.heads.length && (
                      <Menu.Sub.Dropdown>
                        {option.heads.map((_, headIndex) => (
                          <Menu.Item
                            key={headIndex}
                            disabled={option.populatedHeads.some(
                              (c) => c.head === headIndex && c.fixtureId === option.fixture.id,
                            )}
                            onClick={() => onSingleOptionClick(row, col, headIndex, option.fixture.id)}
                          >
                            Head {headIndex + 1}
                          </Menu.Item>
                        ))}
                      </Menu.Sub.Dropdown>
                    )}
                  </Menu.Sub>
                )}
                {option.heads.length === 1 && (
                  <Menu.Item
                    disabled={option.populatedHeads.some((c) => c.fixtureId === option.fixture.id)}
                    onClick={() => onSingleOptionClick(row, col, 0, option.fixture.id)}
                  >
                    Add fixture
                  </Menu.Item>
                )}

                {index < getOptions().length - 1 && <Menu.Divider />}
              </React.Fragment>
            ))}
        </Menu.Dropdown>
      </Menu>
    );
  }

  // if cell, then we have a Fixture and a Head Index.
  // We can reference the fixtures as F1 F2 F3 and head as H1 H2 H3
  const fixtureIndex = fixtures.findIndex((f) => f.id === fixture!.id);
  const headIndex = cell.head;
  return (
    <ConfirmDelete onConfirm={() => onRemoveCells([{ row: cell.row, col: cell.col }])}>
      <ClickableCardBase
        style={{
          width: 75,
          height: 75,
          padding: 0,
          zIndex: popoverOpened ? getDefaultZIndex("overlay") + 1 : undefined, // make sure the popover is above the other cards}}>
        }}
      >
        <Center>{`F${fixtureIndex + 1} H${headIndex + 1}`}</Center>
      </ClickableCardBase>
    </ConfirmDelete>
  );
};

type SimpleGridCell = { row: number; col: number };

/**
 * Keep at most one cell per grid position (rule 3 in fixtureGroups.ts); the first one wins.
 * Also cleans up duplicates saved by an earlier bug, the next time the grid is saved.
 */
const dedupeCells = (cells: GridCell[]): GridCell[] => {
  const seen = new Set<string>();
  return cells.filter((c) => {
    const key = `${c.row}-${c.col}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const Direction = {
  Up: "up",
  Down: "down",
  Left: "left",
  Right: "right",
} as const;
type Direction = (typeof Direction)[keyof typeof Direction];

/** One step in each direction. Rows grow downwards, cols grow to the right. */
const DirectionStep: Record<Direction, SimpleGridCell> = {
  [Direction.Up]: { row: -1, col: 0 },
  [Direction.Down]: { row: 1, col: 0 },
  [Direction.Left]: { row: 0, col: -1 },
  [Direction.Right]: { row: 0, col: 1 },
};

/**
 * Calculate if the current cell can add N heads in the direction.
 * True when every one of the `count` positions (starting at the current cell) is inside the grid and empty.
 */
const canAdd = (
  // the cell we're at
  { row, col }: SimpleGridCell,

  // what direction we want
  direction: Direction,

  // how many to add, including the one at the current cell
  count: number,

  // grid size
  { rows, cols }: { rows: number; cols: number },

  // other filled cells
  otherCells: SimpleGridCell[],
): boolean => {
  if (count < 1) return false;

  const occupied = new Set(otherCells.map((c) => `${c.row}-${c.col}`));
  const step = DirectionStep[direction];

  for (let i = 0; i < count; i++) {
    const r = row + step.row * i;
    const c = col + step.col * i;
    if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
    if (occupied.has(`${r}-${c}`)) return false;
  }
  return true;
};
