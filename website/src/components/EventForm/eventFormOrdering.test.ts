import { describe, expect, it } from "vitest";
import {
  createEmptyEventFormAttribute,
  createEmptyEventFormFixtureGroup,
  createEmptyEventFormValues,
  eventFormValuesToCreateRequest,
  eventFormValuesToUpdateRequest,
} from "./eventFormModel";

describe("attribute ordering", () => {
  it.each([
    ["create", eventFormValuesToCreateRequest],
    ["update", eventFormValuesToUpdateRequest],
  ] as const)("preserves reordered attributes and their values in %s requests", (_, serialize) => {
    const values = createEmptyEventFormValues();
    const group = createEmptyEventFormFixtureGroup(0);
    const first = createEmptyEventFormAttribute(0);
    const second = createEmptyEventFormAttribute(1);
    first.name = "First";
    second.name = "Second";
    group.attributes = { [first.clientId]: first, [second.clientId]: second };
    group.attributeOrder = [second.clientId, first.clientId];
    values.fixtureGroups[group.clientId] = group;
    values.fixtureGroupOrder = [group.clientId];

    const attributes = serialize(values).fixtureGroups?.[0].attributes;
    expect(attributes).toBeDefined();
    if (!attributes) throw new Error("Missing serialized attributes");
    expect(attributes.map(({ name, order }) => ({ name, order }))).toEqual([
      { name: "Second", order: 0 },
      { name: "First", order: 1 },
    ]);
    expect(attributes.every((attribute) => !("clientId" in attribute))).toBe(true);
    expect(first.order).toBe(0);
    expect(second.order).toBe(1);
  });
});
