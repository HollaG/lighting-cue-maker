// save content = Content[] then just lay it out

export interface Content {}

interface TextContent extends Content {
  text: string;
}

/**
 * Describes a user selecting a place for a cue.
 * Note that although it extends TextContent, it is perfectly valid
 * for the text to be a 'space' character.
 *
 * cueId refers to the generated cue id and is stable. refer to `cues.ts`
 */
export interface CueContent extends TextContent {
  cueId: string;

  // other stuff here
}

export interface LineBreakContent extends Content {}
