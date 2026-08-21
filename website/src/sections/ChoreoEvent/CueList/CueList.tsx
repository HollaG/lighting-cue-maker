import { memo, useState } from "react";
import { ActionIcon, Center, Flex, Group, Loader, Stack, Text, Title } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { CueCard } from "../../../components/Siding/CueCard/CueCard";
import { useGetCues } from "../../../query/useGetCues";
import { useAppStore } from "../../../store/appStore";
import type { LightEventConfiguration } from "../../../types/types";
import { useGetOrCreateVisualiser } from "../../../query/useGetOrCreateVisualiser";
import { useGetFixturesByEventId } from "../../../query/useGetFixtures";
import { CustomCoverLoader } from "../../../components/Loader/CustomCoverLoader";
import { ViewModeSelect, type ViewMode } from "../../../components/Siding/CueCard/ViewModeSelect";

type CueListProps = {
  itemId: string;
  event: LightEventConfiguration;
  showCueList: boolean;
  isPendingRendering: boolean;
  canIncreaseWidth: boolean;
  canDecreaseWidth: boolean;
  onIncreaseWidth: () => void;
  onDecreaseWidth: () => void;
};

export const CueList = memo(
  ({
    itemId,
    event,
    showCueList,
    isPendingRendering,
    canIncreaseWidth,
    canDecreaseWidth,
    onIncreaseWidth,
    onDecreaseWidth,
  }: CueListProps) => {
    const { cues, isCuesLoading } = useGetCues({ itemId });

    const cueOrder = useAppStore((s) => s.cueOrder);
    const currentlySelectedCueId = useAppStore((s) => s.currentlySelectedCueId);

    const [offset, setOffset] = useState(0);
    const calculatedOffset = currentlySelectedCueId ? offset : 0;

    // Handle visualisers
    const { visualiser } = useGetOrCreateVisualiser({ eventId: event.id });
    const { fixtures } = useGetFixturesByEventId({ event: event || undefined });

    // handle swap between table and 2D view
    const [globalViewMode, setGlobalViewMode] = useState<ViewMode>("Table");

    return (
      <Stack>
        <Group>
          <Title order={3} flex={1}>
            Cues
          </Title>
          <Flex flex={1} />
          <ViewModeSelect viewMode={globalViewMode} setViewMode={setGlobalViewMode} />

          <ActionIcon size="lg" color="gray" variant="light" onClick={onIncreaseWidth} disabled={!canIncreaseWidth}>
            <IconChevronLeft style={{ width: "1rem" }} />
          </ActionIcon>
          <Text>Adjust width</Text>
          <ActionIcon color="gray" variant="light" onClick={onDecreaseWidth} disabled={!canDecreaseWidth}>
            <IconChevronRight style={{ width: "1rem" }} />
          </ActionIcon>
        </Group>
        {showCueList && itemId && cues && cues.length > 0 && (
          <Stack
            style={{
              transition: "all 0.3s ease-in-out",
              transform: `translateY(${calculatedOffset}px)`,
              zIndex: 10,
            }}
          >
            {isCuesLoading ? (
              <CustomCoverLoader isLoading>
                <CueCard
                  key="loading"
                  cue={{
                    assignments: {},
                    id: "loading",
                    comments: "",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: new Date(),
                  }}
                  cueNumber={0}
                  isCueSelected={false}
                  fixtureGroups={[]}
                  setOffset={() => {}}
                  visualiser={visualiser}
                  fixtures={fixtures}
                  eventId={event.id}
                  globalViewMode={globalViewMode}
                />
              </CustomCoverLoader>
            ) : (
              cueOrder.map((cueId, index) => {
                const cue = cues.find((c) => c.id === cueId);
                if (!cue) return null;
                return (
                  <CueCard
                    key={cue.id}
                    cue={cue}
                    cueNumber={index + 1}
                    isCueSelected={currentlySelectedCueId === cue.id}
                    fixtureGroups={event.fixtureGroups}
                    setOffset={setOffset}
                    visualiser={visualiser}
                    fixtures={fixtures}
                    eventId={event.id}
                    globalViewMode={globalViewMode}
                  />
                );
              })
            )}
          </Stack>
        )}
        {isPendingRendering && (
          <Center>
            <Loader />
          </Center>
        )}
      </Stack>
    );
  },
);
