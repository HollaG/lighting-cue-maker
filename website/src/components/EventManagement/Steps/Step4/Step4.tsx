import { Box, Loader, Stack, Text, Title } from "@mantine/core";
import { useGetPatchedFixtures } from "../../../../query-v2/patched-fixtures/useGetPatchedFixtures";
import { useGetVisualiser } from "../../../../query-v2/visualiser/useGetVisualiser";
import { Visualiser3D } from "../../../Visualiser3D-v2/Visualiser3D";

/** Visualisation placements */
export const Step4 = ({ eventId, onDone }: { eventId: string; onDone: () => void }) => {
  const { visualiser, isVisualiserLoading } = useGetVisualiser(eventId);

  const { patchedFixtures: fixtures } = useGetPatchedFixtures(eventId);

  return (
    // <form
    //   id={STEP_FORM_ID}
    //   onSubmit={(e) => {
    //     e.preventDefault();
    //     onDone();
    //   }}
    // >
    <Stack gap="sm" style={{ width: "100%" }}>
      <Title order={4} flex={1}>
        Configure visualisation
      </Title>
      <Text> Here, you can set up your fixtures how it is in real life, to let users preview the cue.</Text>

      <Box
        style={{
          justifyContent: "center",
          display: "flex",
          alignItems: "center",
          width: "100%",
        }}
        mt="xl"
      >
        {isVisualiserLoading ? (
          <Box>
            <Loader size="lg" type="bars" />
          </Box>
        ) : visualiser ? (
          <Visualiser3D key={visualiser.id} visualiser={visualiser} eventId={eventId} fixtures={fixtures ?? []} />
        ) : (
          <Text>No visualiser found</Text>
        )}
      </Box>
    </Stack>
    // </form>
  );
};
