import { AttributeTypes, type Item } from "../types/types";
import type { QLCCollection, QLCEventJson, QLCFunction } from "../types/qlc";
import { getCueOrder, getValueFromValueAssignment, hasAValue } from "./cueUtils";
import type { ValueAssignment } from "../types/cues";

export const ADV_MAP_KEY = `mapping-type`;
export const ADV_MAP_ALL_VALUE = `map-all`;
export const ADV_MAP_ONE_VALUE = `map-one`;
export const ADV_ORDER_KEY = `function-priority`;
export const ADV_ORDER_FIRST_VALUE = `order-first`;
export const ADV_ORDER_LAST_VALUE = `order-last`;
export const ADV_ORDER_ANY_VALUE = `order-any`;

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
  AttributeTypes.SLIDER_PRESETS,
]);

export const isQlcMappable = (type: AttributeTypes) => QLC_MAPPABLE_TYPES.has(type);

/**
 * Generates QLC+ Collection Function elements from a QLCEventJson preview
 * and inserts them into the <Engine> node of the provided workspace XML.
 *
 * @param workspaceXml   Raw .qxw file content
 * @param preview        QLCEventJson preview data containing edited cues and qlcFunctions
 * @param items          List of items to resolve item names
 * @param startingFnId   ID to assign to the first generated Function element
 * @returns Updated workspace XML string, or undefined on parse error
 */
export function generateAndInsertPreviewCollections(
  workspaceXml: string,
  preview: QLCEventJson,
  items: Item[],
  startingFnId: number,
): string | undefined {
  const parser = new DOMParser();

  // ── Parse the workspace ───────────────────────────────────────────────────

  const workspaceDoc = parser.parseFromString(workspaceXml, "application/xml");
  if (workspaceDoc.querySelector("parsererror")) {
    console.error("[generateAndInsertPreviewCollections] Failed to parse workspace XML");
    return undefined;
  }

  const engineNode = workspaceDoc.querySelector("Engine");
  if (!engineNode) {
    console.error("[generateAndInsertPreviewCollections] No <Engine> node found");
    return undefined;
  }

  // Determine the insertion anchor: right after the last existing <Function>
  // child of <Engine>. null means appendChild (end of Engine).
  const existingFunctions = Array.from(engineNode.children).filter((el) => el.tagName === "Function");
  const insertionAnchor =
    existingFunctions.length > 0 ? existingFunctions[existingFunctions.length - 1].nextSibling : null;

  // ── Generate and insert one Collection per cue preview ────────────────────

  let fnIdCounter = startingFnId;

  for (const [itemId, cuePreviews] of Object.entries(preview)) {
    if (!cuePreviews || cuePreviews.length === 0) continue;

    const item = items.find((i) => i.id === itemId);
    const itemName = item?.name ?? "Item";

    for (const [cueIndex, cuePreview] of cuePreviews.entries()) {
      const { qlcFunctions } = cuePreview;

      // Create <Function ID="…" Type="Collection" Path="…" Name="…">
      const fnEl = workspaceDoc.createElement("Function");
      fnEl.setAttribute("ID", String(fnIdCounter));
      fnEl.setAttribute("Type", "Collection");
      fnEl.setAttribute("Path", `Generated/${itemName}`);
      fnEl.setAttribute(
        "Name",
        `${itemName} ${convertNumberToMinimally2Digits(cueIndex + 1)} ${cuePreview.cue.id.slice(0, 4)}`,
      );
      fnIdCounter++;

      let stepNumber = 0;
      for (const qlcFn of qlcFunctions) {
        if (!qlcFn.ID) continue;

        const stepEl = workspaceDoc.createElement("Step");
        stepEl.setAttribute("Number", String(stepNumber));
        stepEl.textContent = qlcFn.ID;
        fnEl.appendChild(stepEl);
        stepNumber++;
      }

      engineNode.insertBefore(fnEl, insertionAnchor);
    }
  }

  // ── Insert Chasers & Serialize ──────────────────────────────────────────────

  return generateAndInsertChasers(workspaceDoc, items, fnIdCounter);
}

/**
 * Generates and inserts QLC+ Chaser functions into the workspace XML (or Document) for each item.
 * Each Chaser is populated with steps corresponding to the generated Collections for that item.
 *
 * @param workspaceXmlOrDoc The XML string or parsed Document containing workspace data and generated collections
 * @param items List of items
 * @param startingFnId The initial starting function ID for new chaser functions
 * @returns Serialized XML string with inserted Chasers
 */
export function generateAndInsertChasers(
  workspaceXmlOrDoc: string | Document,
  items: Item[],
  startingFnId: number,
): string | undefined {
  let workspaceDoc: Document;
  if (typeof workspaceXmlOrDoc === "string") {
    const parser = new DOMParser();
    workspaceDoc = parser.parseFromString(workspaceXmlOrDoc, "application/xml");
    if (workspaceDoc.querySelector("parsererror")) {
      console.error("[generateAndInsertChasers] Failed to parse workspace XML");
      return undefined;
    }
  } else {
    workspaceDoc = workspaceXmlOrDoc;
  }

  const engineNode = workspaceDoc.querySelector("Engine");
  if (!engineNode) {
    console.error("[generateAndInsertChasers] No <Engine> node found");
    return undefined;
  }

  // let maxId = startingFnId;
  // workspaceDoc.querySelectorAll("Function").forEach((el) => {
  //   const id = Number(el.getAttribute("ID"));
  //   if (!isNaN(id) && id >= maxId) {
  //     maxId = id + 1;
  //   }
  // });
  let fnIdCounter = startingFnId;

  const existingFunctions = Array.from(engineNode.children).filter((el) => el.tagName === "Function");
  const insertionAnchor =
    existingFunctions.length > 0 ? existingFunctions[existingFunctions.length - 1].nextSibling : null;

  for (const item of items) {
    const itemName = item.name ?? "Item";

    // Find all collections generated for this item (Path="Generated/${itemName}")
    const collectionNodes = Array.from(engineNode.querySelectorAll("Function")).filter(
      (el) => el.getAttribute("Type") === "Collection" && el.getAttribute("Path") === `Generated/${itemName}`,
    );

    if (collectionNodes.length === 0) continue;

    const fnEl = workspaceDoc.createElement("Function");
    fnEl.setAttribute("ID", String(fnIdCounter));
    fnEl.setAttribute("Type", "Chaser");
    fnEl.setAttribute("Name", itemName);
    fnEl.setAttribute("Path", `Generated/Chasers`);
    fnIdCounter++;

    const speedEl = workspaceDoc.createElement("Speed");
    speedEl.setAttribute("FadeIn", "0");
    speedEl.setAttribute("FadeOut", "0");
    speedEl.setAttribute("Duration", "4294967294");
    fnEl.appendChild(speedEl);

    const directionEl = workspaceDoc.createElement("Direction");
    directionEl.textContent = "Forward";
    fnEl.appendChild(directionEl);

    const runOrderEl = workspaceDoc.createElement("RunOrder");
    runOrderEl.textContent = "Loop";
    fnEl.appendChild(runOrderEl);

    const speedModesEl = workspaceDoc.createElement("SpeedModes");
    speedModesEl.setAttribute("FadeIn", "Default");
    speedModesEl.setAttribute("FadeOut", "Default");
    speedModesEl.setAttribute("Duration", "Common");
    fnEl.appendChild(speedModesEl);

    collectionNodes.forEach((colNode, i) => {
      const colId = colNode.getAttribute("ID");
      if (!colId) return;

      const stepEl = workspaceDoc.createElement("Step");
      stepEl.setAttribute("Number", String(i));
      stepEl.setAttribute("FadeIn", "0");
      stepEl.setAttribute("Hold", "4294967294");
      stepEl.setAttribute("FadeOut", "0");
      stepEl.textContent = colId;
      fnEl.appendChild(stepEl);
    });

    engineNode.insertBefore(fnEl, insertionAnchor);
  }

  return new XMLSerializer().serializeToString(workspaceDoc);
}

/**
 * Generate a QLC+ Json Preview for previewing before uploading to QLC+.
 *
 * @param items Items with cues
 * @param mapping Form values: `attributeId|value` → QLC+ function ID array
 * @param qlcFunctions Optional list of parsed workspace QLC functions to resolve metadata
 */
export function generatePreview(
  items: Item[],
  mapping: Record<string, string[] | string>,
  qlcFunctionMap: { [fnId: string]: QLCFunction },
): QLCEventJson {
  console.log({ mapping });
  const result: QLCEventJson = {};
  // for each item
  for (const item of items) {
    const { rawLyrics, cues } = item;
    result[item.id] = [];

    if (!rawLyrics || !cues || cues.length === 0) continue;

    // get the cue order to generate
    const cueOrder = getCueOrder(rawLyrics);

    for (const cueId of cueOrder) {
      const cue = cues.find((c) => c.id === cueId);
      if (!cue) continue;

      // Generate a list of attributes & their assignments
      const completeAttributeMap = Object.values(cue.assignments ?? {}).reduce(
        (acc, group) => ({ ...acc, ...group.assignment }),
        {} as Record<string, { type: AttributeTypes; value: ValueAssignment; name: string }>,
      );

      const mappedFunctions: QLCFunction[] = [];
      const seenFnIds = new Set<string>(); //don't add duplicate fns for this attr
      const addFnById = (qlcFnId: string) => {
        if (seenFnIds.has(qlcFnId)) return;
        seenFnIds.add(qlcFnId);

        const existingFn = qlcFunctionMap[qlcFnId];
        if (existingFn) {
          mappedFunctions.push(existingFn);
        } else {
          // missing function, ignore
          // mappedFunctions.push({
          //   ID: qlcFnId,
          //   Type: "Function",
          //   Name: `Function ${qlcFnId}`,
          //   Path: null,
          //   Data: "",
          // });
        }
      };

      // ----- Special controls for Advanced Options -----
      const addLastFnIds: string[] = [];
      const addAnyFnIds: string[] = [];
      const addFirstFnIds: string[] = [];

      // iterate over all the attributes and find the matching [key:attrId, value:QLCFnId[]] in the mapping
      for (const [attrId, attr] of Object.entries(completeAttributeMap)) {
        console.log(`Iteration: attrId=${attrId}, attr.type=${attr.type}`);
        if (!QLC_MAPPABLE_TYPES.has(attr.type)) continue;

        const isSelected = hasAValue(attr.type, attr.value);

        // special case when the user didn't select anything in dropdown
        if (!isSelected) {
          const keyString = `${attrId}|not-selected`;
          const qlcFunctionIds = mapping[keyString];
          if (qlcFunctionIds) {
            // if mapping exists
            // check pick one or pick all
            const mapType = mapping[`${keyString}|${ADV_MAP_KEY}`];

            const isMapAll = mapType === ADV_MAP_ALL_VALUE;
            const isMapOne = mapType === ADV_MAP_ONE_VALUE;

            let fns: string[] = [];
            if (isMapOne) {
              fns = [qlcFunctionIds[Math.floor(Math.random() * qlcFunctionIds.length)]];
            } else if (isMapAll) {
              fns = qlcFunctionIds as string[];
            } else {
              fns = qlcFunctionIds as string[]; // default to all if no special mapping is specified
            }

            // Check special controls
            const keyStringOrderFirst = `${attrId}|not-selected|${ADV_ORDER_FIRST_VALUE}`;
            const keyStringOrderLast = `${attrId}|not-selected|${ADV_ORDER_LAST_VALUE}`;

            if (mapping[keyStringOrderFirst] !== undefined) {
              addFirstFnIds.push(...fns);
            } else if (mapping[keyStringOrderLast] !== undefined) {
              addLastFnIds.push(...fns);
            } else {
              addAnyFnIds.push(...fns);
            }
            continue;
          }
        }

        const selectedValue = getValueFromValueAssignment(attr.type, attr.value);
        const values = Array.isArray(selectedValue) ? selectedValue : [selectedValue];

        for (const v of values) {
          const keyString = `${attrId}|${v}`;
          const qlcFunctionIds = mapping[keyString];
          if (qlcFunctionIds) {
            // check pick one or pick all
            const mapType = mapping[`${keyString}|${ADV_MAP_KEY}`];
            const isMapAll = mapType === ADV_MAP_ALL_VALUE;
            const isMapOne = mapType === ADV_MAP_ONE_VALUE;

            let fns: string[] = [];
            if (isMapOne) {
              fns = [qlcFunctionIds[Math.floor(Math.random() * qlcFunctionIds.length)]];
            } else if (isMapAll) {
              fns = qlcFunctionIds as string[];
            } else {
              fns = qlcFunctionIds as string[]; // default to all if no special mapping is specified
            }

            // Check special controls
            const keyStringOrderFirst = `${attrId}|${v}|${ADV_ORDER_FIRST_VALUE}`;
            const keyStringOrderLast = `${attrId}|${v}|${ADV_ORDER_LAST_VALUE}`;

            if (mapping[keyStringOrderFirst] !== undefined) {
              addFirstFnIds.push(...fns);
            } else if (mapping[keyStringOrderLast] !== undefined) {
              addLastFnIds.push(...fns);
            } else {
              addAnyFnIds.push(...fns);
            }

            // if (attr.type === AttributeTypes.BOOLEAN) {
            //   const randomFnId = qlcFunctionIds[Math.floor(Math.random() * qlcFunctionIds.length)];
            //   addLastFnIds.push(randomFnId);
            // } else {
            //   for (const qlcFnId of qlcFunctionIds) {
            //     addFnById(qlcFnId);
            //   }
            // }
          }
        }
      }

      if (addFirstFnIds.length > 0) {
        addFirstFnIds.forEach(addFnById);
      }
      if (addAnyFnIds.length > 0) {
        addAnyFnIds.forEach(addFnById);
      }

      if (addLastFnIds.length > 0) {
        addLastFnIds.forEach(addFnById);
      }

      result[item.id].push({
        cue,
        qlcFunctions: mappedFunctions,
      });
    }
  }

  return result;
}
