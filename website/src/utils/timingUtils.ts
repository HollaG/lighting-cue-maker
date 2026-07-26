import { notifications } from "@mantine/notifications";
import type { IndicatorTimingMode } from "../store/slices/timingSlice";
import { shortenUUID } from "./convertUuid";
import { showNotification } from "./notifications";
import { generateRaw, generateRich } from "./convertText";

const MAIN_INDICATOR = "♩";
const SUB_INDICATOR = "♪";

export const insertTimingMarkerInRichContent = (
  timing: number,
  type: IndicatorTimingMode,
  lineIndex: number,
  wordIndex: number,
  isSpace: boolean,
  content: string[][],
) => {
  // a timing marker is raw html:
  // <sub class='subscript'>{timing}</sub> for type=main
  // <sup class='superscript'>{timing}</sup> for type=sub
  // wrap them in a span: <span class='supsub'> ... </span>

  // IMPORTANT: the "sub" type is actually mapped to "superscript"

  // place it after the word, or if it's a space, insert it directly into the space, leave no gaps
  // generate a random short id
  const uuid = window.crypto.randomUUID();
  const shortened = shortenUUID(uuid);

  // const marker =
  //   type === "main"
  //     ? `<sup class='superscript' id='supsub-${shortened}'>${timing}</sup>`
  //     : `<sub class='subscript' id='supsub-${shortened}'>${timing}</sub>`;
  // const spanMarker = `<span class='supsub' id='supsub-${shortened}'>${marker}</span>`;

  // Additional rules:
  // 1. A single array element (given by lineIndex and wordIndex) can only have one <sup> and one <sub> timing marker.
  //   -- can have both, none, or 1 of each
  // 2. A <sub> must always come before a <sup>
  // 3. If there is both a <sub> and a <sub>, they must be wrapped:
  //   <span>${marker}</span>
  //   -- Once again, note the lack of space
  // 4. If the clicked-on content is a space character, then
  //      If type === "main", then use a crotchet ♩
  //      If type === "sub", then use a quaver ♪
  //      If type === "main" and "sub", then use a crotehet only
  // TODO: allow customization of the 'sub-beat'

  // Note the lack of spaces, this is because we need to keep this marker together, if nt it will get broken up by the generateContent fn,
  // which splits by " " empty spaces.
  const marker = type === "main" ? `<sub>(${timing})</sub>` : `<sup>${timing}</sup>`;

  const updatedContent = [...content.map((line) => [...line])];

  if (isSpace) {
    // add a "Box ☐" here so that there is still a reference marker
    updatedContent[lineIndex][wordIndex] = `${type === "main" ? MAIN_INDICATOR : SUB_INDICATOR}${marker}`;

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
    const currentWord = updatedContent[lineIndex][wordIndex];
    const existingSub = currentWord.includes("</sub>");
    const existingSup = currentWord.includes("</sup>");

    if (existingSub && type === "main") {
      // showNotification({
      //   title: "Already exists",
      //   message: "A main timing marker for this word already exists",
      //   color: "red",
      // });
      // return updatedContent;

      return removeTimingMarkerFromContent(content, lineIndex, wordIndex, type);
    }

    if (existingSup && type === "sub") {
      // showNotification({
      //   title: "Already exists",
      //   message: "A sub timing marker for this word already exists",
      //   color: "red",
      // });
      // return updatedContent;

      return removeTimingMarkerFromContent(content, lineIndex, wordIndex, type);
    }

    if (existingSub && type === "sub") {
      // Add <sup> after <sub> and wrap both elements in <span>
      const newWord = currentWord.replace(
        /(?:<span>)?(<sub>.*?<\/sub>)(?:<\/span>)?/,
        (_, subTag) => `${subTag}${marker}`,
        // (_, subTag) => `<span>${subTag}${marker}</span>`,
      );

      // because there was an existing subscript (MAIN_INDICATOR), and now we're adding on SUB_INDICATOR,
      // the MAIN_INDICATOR takes precedence, so don't need to replace
      updatedContent[lineIndex][wordIndex] = newWord;
    } else if (existingSup && type === "main") {
      // Add <sub> before <sup> and wrap both elements in <span>
      const newWord = currentWord.replace(
        /(?:<span>)?(<sup>.*?<\/sup>)(?:<\/span>)?/,
        // (_, supTag) => `<span>${marker}${supTag}</span>`,
        (_, supTag) => `${marker}${supTag}`,
      );

      // because there was an existing superscript (SUB_INDICATOR), and now we're adding on MAIN_INDICATOR,
      // the MAIN_INDICATOR takes precedence, so need to replace
      updatedContent[lineIndex][wordIndex] = newWord.replace(SUB_INDICATOR, MAIN_INDICATOR);
    } else {
      // Brand new timing marker on this word
      updatedContent[lineIndex][wordIndex] = currentWord + marker;
    }
  }

  return updatedContent;
};

/**
 * Removes an superscript or subscript indicator.
 * As there can only be one of each, it is safe to blindly remove.
 *   <sub>2</sub>
 *   <sup>6</sup>
 *
 */
export const removeTimingMarkerFromContent = (
  content: string[][],
  lineIndex: number,
  wordIndex: number,
  type: IndicatorTimingMode,
) => {
  const updatedContent = [...content.map((line) => [...line])];
  if (type === "main") {
    // remove <sub>.*?</sub>
    console.log("removing", updatedContent[lineIndex][wordIndex]);
    const replaced = updatedContent[lineIndex][wordIndex].replace(/<sub>.*?<\/sub>/, "");
    console.log("removed", replaced);

    if (replaced === MAIN_INDICATOR || replaced === SUB_INDICATOR) {
      // if only the indicator is left, means there's nothing else in the item,
      // means we can safely remove the whole item
      updatedContent[lineIndex][wordIndex] = "";
    } else {
      // there's something else in the item (maybe some text).
      // if there still is a SUB_INDICATOR, we need to replace the MAIN_INDICATOR (if any) with a SUB_INDICATOR
      updatedContent[lineIndex][wordIndex] = replaced.replace(MAIN_INDICATOR, SUB_INDICATOR);
    }
  } else {
    // remove <sup>.*?</sup>
    const replaced = updatedContent[lineIndex][wordIndex].replace(/<sup>.*?<\/sup>/, "");
    if (replaced === MAIN_INDICATOR || replaced === SUB_INDICATOR) {
      updatedContent[lineIndex][wordIndex] = "";
    } else {
      updatedContent[lineIndex][wordIndex] = replaced.replace(SUB_INDICATOR, MAIN_INDICATOR);
    }
  }

  return updatedContent;
};

export const removeTimingMarkerFromRawLyrics = (
  rawLyrics: string,
  lineIndex: number,
  wordIndex: number,
  type: IndicatorTimingMode,
) => {
  const content = generateRich(rawLyrics);
  const updatedContent = removeTimingMarkerFromContent(content, lineIndex, wordIndex, type);
  return generateRaw(updatedContent);
};
