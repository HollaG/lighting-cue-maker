export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "lyric-reference"; lineIndex: number; wordIndex: number }
  | { type: "cue-reference"; cueId: string };

export type ChatMessageData = {
  messageId: string;
  content: ContentBlock[];
  toId?: string;
  fromId: string;
  sentAt: number;
};
