// possible embedded rich types:
//  1. cue (embedded as 2 options:)
//    a. with lyrics
//       -- string: if happy ever after [did][cue_id=uuid] exist
//       -- string: if happy every after [cue_id=uuid] did exist
//    b. in a space
//       -- string: if happy ever after did {cueId=uuid=cueId} exist
//  2. bump
//    same options as cue, but with {bumpId=xxx=bumpId} instead
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

          // split by space within each line so each word is a individual item in the array
          .split(/[\ ]+/g)
          .filter((word) => !word.includes("<comment") && !word.includes("</comment>"))

          // Convert a "word"
          // If the word is an actual word, then add a space in front of it
          // If the word is an empty string, then it is a line break
          // Split by "-" so we can segment words with multiple syllables
          .flatMap((word) => {
            if (word.length === 0) return "";
            if (word.includes("-")) {
              const syllables = word.split("-");
              const syllableMap = syllables.flatMap((syllable, index) => {
                const out = [syllable];
                if (index < syllables.length - 1) out.push("-");
                return out;
              });

              return [" ", ...syllableMap];
            }

            return [" ", ...[word]];
          }), // DO NOT add spaces for line breaks. Line breaks are represented as "".
    )

    // Add a space at the end of every line (so that we can potentially click on that div at the end of the line)
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
