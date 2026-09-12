export type ContentBlock =
  string | { type: "lyric-reference"; lineIndex: number; wordIndex: number } | { type: "cue-reference"; cueId: string };

export type ChatMessageData = {
  messageId: string;
  content: ContentBlock[];
  toId?: string;
  fromId: string;
};
