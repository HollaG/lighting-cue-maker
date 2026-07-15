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

  console.log({ splitLines });

  const splitWord = splitLines.map((line) =>
    line
      .trim()
      .split(/[\ \-]+/g)
      .filter((word) => !word.includes("<comment") && !word.includes("</comment>")),
  );
  const joined = splitLines.join(" <break> ");

  console.log(splitWord);
  // first, split the rawLyrics
  const splitRaw = joined.split(/[\ \-]+/g);

  // don't handle comments for now, filter them out
  const splitFiltered = splitRaw;

  return splitWord;
};
