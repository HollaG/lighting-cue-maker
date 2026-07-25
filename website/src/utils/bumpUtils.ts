import { convertUuidForDatabase, convertUuidForEmbedding } from "./convertUuid";

export const BUMP_MATCH_REGEX = /<bumpId=(.*?)=bumpId>/;
export const BUMP_START = "<bumpId=";
export const BUMP_END = "=bumpId>";

export const insertBumpInRichContent = (
  id: string,
  lineIndex: number,
  wordIndex: number,
  isSpace: boolean,
  content: string[][],
): string[][] => {
  const updatedContent = [...content.map((line) => [...line])];

  if (isSpace) {
    const bumpId = "<bumpId=" + convertUuidForEmbedding(id) + "=bumpId>";
    updatedContent[lineIndex][wordIndex] = bumpId;

    const isLineBreak = updatedContent[lineIndex].length === 1;

    const line = updatedContent[lineIndex];

    line.splice(wordIndex + 1, 0, " ");
    line.splice(wordIndex, 0, " ");
    updatedContent[lineIndex] = line;

    if (isLineBreak) {
      updatedContent.splice(lineIndex + 1, 0, [" "]);
      updatedContent.splice(lineIndex, 0, [" "]);
    }
  } else {
    const bumpId = "<bumpId=" + convertUuidForEmbedding(id) + "=bumpId>" + updatedContent[lineIndex][wordIndex];
    updatedContent[lineIndex][wordIndex] = bumpId;
  }

  return updatedContent;
};

export const removeBumpFromRawLyrics = (rawLyrics: string, bumpId: string) => {
  return rawLyrics.replace("<bumpId=" + convertUuidForEmbedding(bumpId) + "=bumpId>", "");
};

export const getBumpOrder = (rawLyrics: string) => {
  const order: string[] = [];
  for (const line of rawLyrics.split("\n")) {
    for (const word of line.split(/[ -]/)) {
      const match = word.match(/<bumpId=(.*?)=bumpId>/);
      if (match) order.push(convertUuidForDatabase(match[1]));
    }
  }
  return order;
};