import { describe, expect, it } from "vitest";
import { AttributeTypes, BooleanOptions, type LightEventConfiguration } from "../../types/types";
import {
  createEmptyEventFormAttribute,
  createEmptyEventFormFixtureGroup,
  eventFormValuesToUpdateRequest,
  eventToEventFormValues,
} from "./eventFormModel";

describe("eventToEventFormValues", () => {
  it("keeps backend IDs separate from frontend client IDs", () => {
    const event: LightEventConfiguration = {
      id: "event-id",
      name: "Test event",
      description: "",
      externalLink: "",
      fixtureGroups: [
        {
          id: "fixture-group-id",
          name: "Front lights",
          order: 0,
          attributes: [
            {
              id: "attribute-id",
              name: "Colour",
              type: AttributeTypes.COLOUR,
              metadata: {},
              order: 0,
              optionPossibleValues: {
                [AttributeTypes.SELECT]: [],
                [AttributeTypes.MULTISELECT]: [],
                [AttributeTypes.COLOUR]: [{ hex: "#ffffff", name: "White" }],
                [AttributeTypes.SLIDER]: { min: 0, max: 100 },
                [AttributeTypes.BOOLEAN]: BooleanOptions.UNCHECKED,
                [AttributeTypes.TEXT]: "",
                [AttributeTypes.NONE]: null,
              },
            },
          ],
        },
      ],
      bumpConfigurations: [],
    };

    const values = eventToEventFormValues(event);
    const fixtureGroupClientId = values.fixtureGroupOrder[0];
    const fixtureGroup = values.fixtureGroups[fixtureGroupClientId];
    const attributeClientId = fixtureGroup.attributeOrder[0];
    const attribute = fixtureGroup.attributes[attributeClientId];

    expect(fixtureGroupClientId).not.toBe(fixtureGroup.id);
    expect(fixtureGroup.clientId).toBe(fixtureGroupClientId);
    expect(fixtureGroup.id).toBe("fixture-group-id");
    expect(attributeClientId).not.toBe(attribute.id);
    expect(attribute.clientId).toBe(attributeClientId);
    expect(attribute.id).toBe("attribute-id");
    expect(attribute.optionPossibleValues.colour).toEqual([{ hex: "#ffffff", name: "White" }]);
  });

  it("serializes existing and new records for the aggregate event PATCH", () => {
    const event: LightEventConfiguration = {
      id: "event-id",
      name: "Test event",
      description: "Description",
      externalLink: "https://example.com",
      cuesPerBand: 10,
      uniqueCuesPerBand: 5,
      fixtureGroups: [
        {
          id: "fixture-group-id",
          name: "Front lights",
          order: 99,
          attributes: [
            {
              id: "attribute-id",
              name: "Intensity",
              type: AttributeTypes.SLIDER,
              metadata: {},
              order: 99,
              optionPossibleValues: {
                [AttributeTypes.SELECT]: [],
                [AttributeTypes.MULTISELECT]: [],
                [AttributeTypes.COLOUR]: [],
                [AttributeTypes.SLIDER]: { min: 0, max: 100 },
                [AttributeTypes.BOOLEAN]: BooleanOptions.UNCHECKED,
                [AttributeTypes.TEXT]: "",
                [AttributeTypes.NONE]: null,
              },
            },
          ],
        },
      ],
      bumpConfigurations: [],
    };

    const values = eventToEventFormValues(event);
    const existingGroup = values.fixtureGroups[values.fixtureGroupOrder[0]];
    const newAttribute = createEmptyEventFormAttribute(existingGroup.attributeOrder.length);
    newAttribute.name = "Colour";
    newAttribute.type = AttributeTypes.COLOUR;
    existingGroup.attributes[newAttribute.clientId] = newAttribute;
    existingGroup.attributeOrder.push(newAttribute.clientId);

    const newGroup = createEmptyEventFormFixtureGroup(values.fixtureGroupOrder.length);
    newGroup.name = "Back lights";
    values.fixtureGroups[newGroup.clientId] = newGroup;
    values.fixtureGroupOrder.push(newGroup.clientId);

    const request = eventFormValuesToUpdateRequest(values);

    expect(request.fixtureGroups).toHaveLength(2);
    expect(request.fixtureGroups?.[0]).toMatchObject({
      id: "fixture-group-id",
      name: "Front lights",
      order: 0,
    });
    expect(request.fixtureGroups?.[0].attributes[0]).toMatchObject({
      id: "attribute-id",
      name: "Intensity",
      order: 0,
    });
    expect(request.fixtureGroups?.[0].attributes[1]).toMatchObject({
      name: "Colour",
      order: 1,
    });
    expect(request.fixtureGroups?.[0].attributes[1]).not.toHaveProperty("id");
    expect(request.fixtureGroups?.[1]).toMatchObject({
      name: "Back lights",
      order: 1,
      attributes: [],
    });
    expect(request.fixtureGroups?.[1]).not.toHaveProperty("id");
    expect(JSON.stringify(request)).not.toContain("clientId");
  });
});
