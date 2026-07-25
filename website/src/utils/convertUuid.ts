// Because cues require embedding in the Text Input, and the fact that UUID v4
// contains hyphens, we need to convert the UUIDs to use underscores instead.

// This is because we split the text by spaces AND hyphens. We assume that hyphens are used to
// separate syllabes in a word.

// Always prefer operating in original UUID form, and only convert to underscore when absolutely necessary.

export const convertUuidForEmbedding = (uuid: string) => {
  // uuid.replaceAll("-", "_");
  return shortenUUID(uuid);
};
export const convertUuidForDatabase = (uuid: string) => {
  // support legacy
  if (uuid.length === 36) return uuid.replaceAll("_", "-");
  return expandUUID(uuid);
};
// 1. Convert standard 36-char UUID to 22-char base-62 string
const BASE62_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = 62n;
const SHORT_UUID_LENGTH = 22;

export function shortenUUID(uuid: string): string {
  const hex = uuid.replaceAll("-", "");
  let num = BigInt("0x" + hex);

  if (num === 0n) return "0".repeat(SHORT_UUID_LENGTH);

  let result = "";
  while (num > 0n) {
    result = BASE62_CHARS[Number(num % BASE)] + result;
    num = num / BASE;
  }

  return result.padStart(SHORT_UUID_LENGTH, "0");
}

// 2. Reverse the process: Convert 22-char base-62 string back to 36-char UUID
export function expandUUID(shortId: string): string {
  let num = 0n;
  for (const char of shortId) {
    const index = BASE62_CHARS.indexOf(char);
    if (index === -1) throw new Error(`Invalid base-62 character: ${char}`);
    num = num * BASE + BigInt(index);
  }

  const hex = num.toString(16).padStart(32, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
