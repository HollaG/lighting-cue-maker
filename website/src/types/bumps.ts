export interface Bumps {
  id: string;
  bumpId: string; // Map to the BumpConfiguration. Find the bump config from the ID

  comments: string; // comments by the user

  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}
