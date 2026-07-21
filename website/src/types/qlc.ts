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

  const existingFunctions = Array.from(engineNode.children).filter(
    (el) => el.tagName === "Function",
  );

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
