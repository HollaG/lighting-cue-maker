// possible embedded rich types:
//  1. cue (embedded as 2 options:)
//    a. with lyrics
//       -- string: if happy ever after <cue id=uuid>did</cue> exist
//       -- string: if happy every <cue id=uuid>after did</cue> exist
//    b. in a space
//       -- string: if happy ever after did <cue id=uuid/>> exist (note the self-closing)
//  2. one-shot
//  3. comments
//    -- string: if <comment id=uuivd> happy ever after </comment> did exist

// possible embedded rich types:
//  1. cue (embedded as 2 options:)
//    a. with lyrics
//       -- string: if happy ever after [did][cue_id=uuid] exist
//       -- string: if happy every after [cue_id=uuid] did exist
//    b. in a space
//       -- string: if happy ever after did <cue id=uuid/>> exist (note the self-closing)
//  2. one-shot
//  3. comments
//    -- string: if <comment_id=uuivd> happy ever after </comment_id=uuidv4> did exist

// should split by:
//  " " (spaces)
//  " - " (hyphen)
export const generateRich = (rawLyrics: string) => {
  const splitLines = rawLyrics.split("\n");

  // const _out1 = []
  // for (let i = 0; i < splitLines.length; i++) {

  // }

  const splitWord = splitLines
    .map(
      (line) =>
        line
          .trim()
          .split(/[\ ]+/g)
          .filter((word) => !word.includes("<comment") && !word.includes("</comment>"))
          .flatMap((word) => (word.length !== 0 ? [" ", word] : word)), // DO NOT add spaces for line breaks. Line breaks are represented as "".
    )
    .map((line) => (line[line.length - 1] === "" ? line : [...line, " "])) // DO NOT add spaces for line breaks

    // Convert all "line break" characters to a space character so we can treat them the same TODO: do we want to separate line break characters?
    .map((line) => line.map((word) => (word === "" ? " " : word)));

  return splitWord;
};

// 1. Remove empty space from the start and end of each line (note: we added this in `generateRich`)
export const generateRaw = (content: string[][]) => {
  const c = content.map((line) => {
    if (line.length === 1 && line[0] === " ") {
      // this is a line break character
      return [""];
    }
    return line.join("").trim();
  });
  return c.join("\n");
};
