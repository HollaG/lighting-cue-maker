import { Alert, Box, Button, Code, Collapse, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconExclamationCircle, IconHelpCircle, IconInfoCircle } from "@tabler/icons-react";
import type { CueValidationIssue } from "../../../utils/cue/cueValidator";

interface CueNoticesProps {
  notices: CueValidationIssue[];
  warnings: CueValidationIssue[];
  errors: CueValidationIssue[];
  showNotices: boolean;
  showWarnings: boolean;
  showErrors: boolean;

  customResults: CueValidationIssue[];

  setShowNotices: (show: boolean) => void;
  setShowWarnings: (show: boolean) => void;
  setShowErrors: (show: boolean) => void;
  onCustomResultsClick: ((...args: any[]) => void)[];
}

export const CueNotices = ({
  notices,
  warnings,
  errors,
  showNotices,
  showWarnings,
  showErrors,
  setShowNotices,
  setShowWarnings,
  setShowErrors,
  customResults,
  onCustomResultsClick,
}: CueNoticesProps) => (
  <Stack gap="xs">
    {customResults.length > 0 && (
      <Box key="custom">
        <Collapse expanded={true}>
          <Stack>
            {customResults.map((result, index) => (
              <Alert
                key={`${result.type}-${index}`}
                style={{ cursor: "pointer" }}
                icon={<IconInfoCircle />}
                color="lime"
                // withCloseButton
                // closeButtonLabel="Dismiss"
                // onClose={() => setShowNotices(false)}
                // onClick={() => onCustomResultsClick[0]()}
              >
                <Group wrap="nowrap" mr="md">
                  <Text flex={1}>
                    {result.message}
                  </Text>
                  <Button size="xs" variant="outline" onClick={() => onCustomResultsClick[0]()}>
                    {" "}
                    Change to blackout{" "}
                  </Button>
                </Group>
              </Alert>
            ))}
          </Stack>
        </Collapse>
      </Box>
    )}

    {notices.length > 0 && (
      <Box key="notices">
        <Collapse expanded={showNotices}>
          <Alert
            style={{ cursor: "pointer" }}
            icon={<IconInfoCircle />}
            color="lime"
            withCloseButton
            closeButtonLabel="Dismiss"
            onClose={() => setShowNotices(false)}
            onClick={() => setShowNotices(false)}
          >
            <Stack gap="2px">
              {notices.map((notice, index) => (
                <Tooltip label={notice.message} key={index}>
                  <Group style={{ width: "fit-content" }}>
                    <Code color="light-dark(var(--mantine-color-lime-3), var(--mantine-color-lime-9))">
                      {notice.group.name}
                    </Code>
                    <Text>missing</Text>
                    <Code>{notice.attributes.map((attribute) => attribute.name).join(", ")}</Code>
                  </Group>
                </Tooltip>
              ))}
            </Stack>
          </Alert>
        </Collapse>
      </Box>
    )}

    {warnings.length > 0 && (
      <Box key="warnings">
        <Collapse expanded={showWarnings}>
          <Alert
            style={{ cursor: "pointer" }}
            icon={<IconHelpCircle />}
            color="yellow"
            withCloseButton
            closeButtonLabel="Dismiss"
            onClose={() => setShowWarnings(false)}
            onClick={() => setShowWarnings(false)}
          >
            <Stack gap="2px">
              {warnings.map((warning, index) => (
                <Tooltip label={warning.message} key={index}>
                  <Group style={{ width: "fit-content" }}>
                    <Code color="light-dark(var(--mantine-color-yellow-3), var(--mantine-color-yellow-9))">
                      {warning.group.name}
                    </Code>
                    <Text>missing</Text>
                    <Code>{warning.attributes.map((attribute) => attribute.name).join(", ")}</Code>
                  </Group>
                </Tooltip>
              ))}
            </Stack>
          </Alert>
        </Collapse>
      </Box>
    )}

    {errors.length > 0 && (
      <Box key="errors">
        <Collapse expanded={showErrors}>
          <Alert
            style={{ cursor: "pointer" }}
            icon={<IconExclamationCircle />}
            color="red"
            withCloseButton
            closeButtonLabel="Dismiss"
            onClose={() => setShowErrors(false)}
            onClick={() => setShowErrors(false)}
            radius="sm"
          >
            <Stack gap="2px">
              {errors.map((error, index) => (
                <Tooltip label={error.message} key={index}>
                  <Group style={{ width: "fit-content" }}>
                    <Code color="light-dark(var(--mantine-color-red-3), var(--mantine-color-red-9))">
                      {error.group.name}
                    </Code>
                    <Text>missing</Text>
                    <Code>{error.attributes.map((attribute) => attribute.name).join(", ")}</Code>
                  </Group>
                </Tooltip>
              ))}
            </Stack>
          </Alert>
        </Collapse>
      </Box>
    )}
  </Stack>
);
