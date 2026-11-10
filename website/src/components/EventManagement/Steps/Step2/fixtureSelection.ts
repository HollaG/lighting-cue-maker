import type { FixtureTemplateSummary } from "../../../../query-v2/fixture-templates/useGetFixtureTemplates";

// template id -> mode id -> number of fixtures to patch
export type FixtureSelection = {
  [templateId: string]: {
    [modeId: string]: number;
  };
};

// one row in the selected-fixtures list
export type SelectedRow = { template: FixtureTemplateSummary; modeId: string; modeName: string; count: number };

/** One row per (template, mode), grouped by manufacturer. Templates not in the library are skipped. */
export const groupSelectionByManufacturer = (
  selection: FixtureSelection,
  fixtureTemplates: FixtureTemplateSummary[],
): Record<string, SelectedRow[]> => {
  const acc: Record<string, SelectedRow[]> = {};
  for (const [templateId, modes] of Object.entries(selection)) {
    const template = fixtureTemplates.find((t) => t.id === templateId);
    if (!template) continue;

    for (const [modeId, count] of Object.entries(modes)) {
      const modeName = template.modes.find((m) => m.id === modeId)?.name ?? modeId;
      (acc[template.manufacturer] ??= []).push({ template, modeId, modeName, count });
    }
  }
  return acc;
};
