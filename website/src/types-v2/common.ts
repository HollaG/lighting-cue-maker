/** Timestamps on every v2 table. Sent by the server as ISO strings. */
export type Timestamps = {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};
