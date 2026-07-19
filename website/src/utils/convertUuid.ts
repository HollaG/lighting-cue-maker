// Because cues require embedding in the Text Input, and the fact that UUID v4
// contains hyphens, we need to convert the UUIDs to use underscores instead.

// This is because we split the text by spaces AND hyphens. We assume that hyphens are used to
// separate syllabes in a word.

// Always prefer operating in original UUID form, and only convert to underscore when absolutely necessary.

export const convertUuidForEmbedding = (uuid: string) => uuid.replaceAll("-", "_");
export const convertUuidForDatabase = (uuid: string) => uuid.replaceAll("_", "-");
