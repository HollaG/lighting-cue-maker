export type ChatParticipant = {
  id: string;
  name: string;
};

export type ChatMessage = {
  id: string;
  sender: ChatParticipant;
  text: string;
  sentAt: number;
};
