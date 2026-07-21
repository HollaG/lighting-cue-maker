// ─── Types ───────────────────────────────────────────────────────────────────

import type { Cue } from "./cues";
import { AttributeTypes, type Item } from "./types";
import { getCueOrder, getValueFromValueAssignment } from "../utils/cueUtils";

// Define the specific type based on your requirements
export type QLCFunction = {
  ID: string | null;
  Type: string | null;
  Name: string | null;
  Path: string | null;
  Data: string;
};

export interface QLCCollection extends QLCFunction {
  Type: "Collection";
  Steps: { Number: number; Value: number }[];
}

export interface QLCStep {
  Number: number;
  Value: number;
}
/**
 * Converts a QLC+ Workspace XML string into a JSON array of QLCFunction objects.
 * It strictly targets the <Function> nodes within the <Engine> section.
 *
 * @param xmlString The raw XML string from the workspace file
 * @returns An array of QLCFunction objects
 */
export function extractQLCFunctionsToJSON(xmlString: string): QLCFunction[] {
  // Initialize the DOM parser
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  // Verify there are no parsing errors
  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    console.error("Error parsing XML");
    return [];
  }

  // Isolate the <Engine> node
  const engineNode = xmlDoc.querySelector("Engine");
  if (!engineNode) {
    console.warn("No <Engine> tag found in the provided XML.");
    return [];
  }

  // Find all <Function> nodes strictly within <Engine>
  const functionNodes = engineNode.querySelectorAll("Function");
  const qlcFunctions: QLCFunction[] = [];
  const serializer = new XMLSerializer();

  // Iterate over each function and build the object
  functionNodes.forEach((node) => {
    // Serialize all child nodes to a single string for the 'Data' field
    let internalData = "";
    node.childNodes.forEach((childNode) => {
      internalData += serializer.serializeToString(childNode);
    });

    // Extract attributes, providing null fallback if they don't exist (like 'Path')
    qlcFunctions.push({
      ID: node.getAttribute("ID"),
      Type: node.getAttribute("Type"),
      Name: node.getAttribute("Name"),
      Path: node.getAttribute("Path"),
      Data: internalData.trim(),
    });
  });

  return qlcFunctions;
}

export function convertQLCCollectionJsonToXmlString(collection: QLCCollection): string {
  return `
  <Function ID="${collection.ID}" Type="Collection" Name="${collection.Name}" Path="${collection.Path}">
    ${collection.Steps.map((step) => `<Step Number="${step.Number}" Value="${step.Value}" />`).join("")}
  </Function>
  `;
}

export function convertQLCFunctionToXmlString(func: QLCFunction): string {
  if (func.Type === "Collection") {
    return convertQLCCollectionJsonToXmlString(func as QLCCollection);
  }
  return `
  <Function ID="${func.ID}" Type="${func.Type}" Name="${func.Name}" Path="${func.Path}">
    ${func.Data}
  </Function>
  `;
}

export const handleAddFunction = (xmlString: string, newFunctionXml: string) => {
  const parser = new DOMParser();

  // 1. Parse the main workspace XML string
  const xmlDoc = parser.parseFromString(xmlString, "application/xml");

  // Check for XML parsing errors
  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    console.error("Error parsing workspace XML:", parserError.textContent);
    return;
  }

  // 2. Parse the snippet string into a Node
  const snippetDoc = parser.parseFromString(newFunctionXml, "application/xml");
  const newFunctionNode = snippetDoc.documentElement; // The <Function> element

  // Check for XML parsing errors in snippet
  if (snippetDoc.querySelector("parsererror")) {
    console.error("Error parsing new function snippet XML");
    return;
  }

  // 3. Import the node into the main XML document context
  const importedNode = xmlDoc.importNode(newFunctionNode, true);

  // 4. Locate <Engine> first, then find <Function> nodes strictly within it.
  // Using element.children (DOM-scoped to the Engine node) guarantees we never
  // accidentally match <Function> elements inside <Monitor> or any other sibling.
  const engineNode = xmlDoc.querySelector("Engine");
  if (!engineNode) {
    console.error("No <Engine> node found in the workspace XML");
    return;
  }

  const existingFunctions = Array.from(engineNode.children).filter((el) => el.tagName === "Function");

  if (existingFunctions.length > 0) {
    // Insert after the last direct-child <Function> of <Engine>
    const lastFunction = existingFunctions[existingFunctions.length - 1];
    engineNode.insertBefore(importedNode, lastFunction.nextSibling);
  } else {
    // No existing functions — append directly to <Engine>
    engineNode.appendChild(importedNode);
  }

  // 5. Serialize back to XML string
  const serializer = new XMLSerializer();
  const updatedXmlString = serializer.serializeToString(xmlDoc);

  console.log("Updated XML:", updatedXmlString);
  return updatedXmlString;
};

export function convertNumberToMinimally2Digits(number: number) {
  return number.toString().padStart(2, "0");
}

/**
 * AttributeTypes that can be mapped to QLC+ functions.
 * Slider/Text/None are continuous or free-form — not discrete options the user maps.
 */
export const QLC_MAPPABLE_TYPES = new Set<AttributeTypes>([
  AttributeTypes.BOOLEAN,
  AttributeTypes.COLOUR,
  AttributeTypes.MULTISELECT,
  AttributeTypes.SELECT,
]);

export const isQlcMappable = (type: AttributeTypes) => QLC_MAPPABLE_TYPES.has(type);

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Generates QLC+ Collection Function elements from the cue data and the
 * user's attribute→function mapping, then inserts them into the <Engine>
 * node of the provided workspace XML.
 *
 * Uses DOM APIs throughout — no manual string concatenation.
 *
 * @param workspaceXml   Raw .qxw file content
 * @param items          Items with preloaded cues (from /api/v1/qlc/:id/generate)
 * @param mapping        Form values: `attributeId|value` → QLC+ function ID array
 * @param startingFnId   ID to assign to the first generated Function element
 * @returns Updated workspace XML string, or undefined on parse error
 */
export function generateAndInsertCollections(
  workspaceXml: string,
  items: Item[],
  mapping: Record<string, string[]>,
  startingFnId: number,
): string | undefined {
  const parser = new DOMParser();

  // ── Parse the workspace ───────────────────────────────────────────────────

  const workspaceDoc = parser.parseFromString(workspaceXml, "application/xml");
  if (workspaceDoc.querySelector("parsererror")) {
    console.error("[generateAndInsertCollections] Failed to parse workspace XML");
    return undefined;
  }

  const engineNode = workspaceDoc.querySelector("Engine");
  if (!engineNode) {
    console.error("[generateAndInsertCollections] No <Engine> node found");
    return undefined;
  }

  // Determine the insertion anchor: right after the last existing <Function>
  // child of <Engine>.  null means appendChild (end of Engine).
  const existingFunctions = Array.from(engineNode.children).filter((el) => el.tagName === "Function");
  const insertionAnchor =
    existingFunctions.length > 0 ? existingFunctions[existingFunctions.length - 1].nextSibling : null;

  // ── Generate and insert one Collection per cue ───────────────────────────

  let fnIdCounter = startingFnId;

  for (const item of items) {
    const { name, rawLyrics, cues } = item;

    if (!rawLyrics) continue;
    if (!cues || cues.length === 0) continue;

    const cueOrder = getCueOrder(rawLyrics);

    for (const [cueIndex, cueId] of cueOrder.entries()) {
      const cue = cues.find((c) => c.id === cueId);
      if (!cue) {
        console.error(`[generateAndInsertCollections] Cue ${cueId} in cueOrder but not in cue list`);
        continue;
      }

      // Create <Function ID="…" Type="Collection" Path="…" Name="…">
      const fnEl = workspaceDoc.createElement("Function");
      fnEl.setAttribute("ID", String(fnIdCounter));
      fnEl.setAttribute("Type", "Collection");
      fnEl.setAttribute("Path", `Generated/${name}`);
      fnEl.setAttribute("Name", `${name} ${convertNumberToMinimally2Digits(cueIndex + 1)}`);
      fnIdCounter++;

      // Flatten all group assignments into a single attribute map
      const completeAttributeMap = Object.values(cue.assignments ?? {}).reduce(
        (acc, group) => ({ ...acc, ...group.assignment }),
        {} as Record<string, { type: AttributeTypes; value: any; name: string }>,
      );

      let stepNumber = 0;

      for (const [attrId, attr] of Object.entries(completeAttributeMap)) {
        if (!QLC_MAPPABLE_TYPES.has(attr.type)) continue;

        const selectedValue = getValueFromValueAssignment(attr.type, attr.value);

        // Normalise: multi-select returns string[], everything else returns a single value.
        // Wrap scalars in an array so the loop below is uniform.
        const values = Array.isArray(selectedValue) ? selectedValue : [selectedValue];

        for (const v of values) {
          const keyString = `${attrId}|${v}`;
          const qlcFunctionIds = mapping[keyString];

          if (!qlcFunctionIds || qlcFunctionIds.length === 0) {
            console.warn(`[generateAndInsertCollections] No QLC+ function mapped for "${keyString}"`);
            continue;
          }

          // One <Step> per mapped QLC+ function ID
          for (const qlcFnId of qlcFunctionIds) {
            const stepEl = workspaceDoc.createElement("Step");
            stepEl.setAttribute("Number", String(stepNumber));
            stepEl.textContent = qlcFnId;
            fnEl.appendChild(stepEl);
            stepNumber++;
          }
        }
      }

      engineNode.insertBefore(fnEl, insertionAnchor);
    }
  }

  // ── Serialize ─────────────────────────────────────────────────────────────

  return new XMLSerializer().serializeToString(workspaceDoc);
}
