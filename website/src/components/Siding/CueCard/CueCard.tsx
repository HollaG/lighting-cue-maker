import { Stack } from "@mantine/core";
import { CardBase } from "../CardBase";

export const CueCard = ({ cueId }: { cueId: string }) => {
  return <CardBase isActive={false}>Cue ID {cueId}</CardBase>;
};
