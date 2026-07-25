import { describe, it, expect } from "vitest";
import {
  insertBumpInRichContent,
  getBumpOrder,
  removeBumpFromRawLyrics,
  BUMP_START,
  BUMP_END,
} from "../bumpUtils";

describe("bumpUtils", () => {
  it("constants use curly braces", () => {
    expect(BUMP_START).toBe("{bumpId=");
    expect(BUMP_END).toBe("=bumpId}");
  });

  it("insertBumpInRichContent inserts {bumpId=...=bumpId} into word", () => {
    const initialContent = [["hello", "world"]];
    const testId = "87654321-4321-4321-4321-cba987654321";
    const result = insertBumpInRichContent(testId, 0, 0, false, initialContent);

    expect(result[0][0]).toContain("{bumpId=");
    expect(result[0][0]).toContain("=bumpId}hello");
    expect(result[0][0]).not.toContain("<bumpId=");
  });

  it("insertBumpInRichContent inserts {bumpId=...=bumpId} into space", () => {
    const initialContent = [["hello", " ", "world"]];
    const testId = "87654321-4321-4321-4321-cba987654321";
    const result = insertBumpInRichContent(testId, 0, 1, true, initialContent);

    expect(result[0]).toContain("{bumpId=87654321_4321_4321_4321_cba987654321=bumpId}");
  });

  it("getBumpOrder parses both {bumpId=...=bumpId} and legacy <bumpId=...=bumpId>", () => {
    const rawLyrics =
      "Hello {bumpId=11111111_1111_1111_1111_111111111111=bumpId}world <bumpId=22222222_2222_2222_2222_222222222222=bumpId>test";
    const order = getBumpOrder(rawLyrics);

    expect(order).toEqual([
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
    ]);
  });

  it("removeBumpFromRawLyrics removes curly and legacy angle bump tags", () => {
    const testId = "87654321-4321-4321-4321-cba987654321";
    const rawWithCurly = "Hello {bumpId=87654321_4321_4321_4321_cba987654321=bumpId}world";
    const rawWithAngle = "Hello <bumpId=87654321_4321_4321_4321_cba987654321=bumpId>world";

    expect(removeBumpFromRawLyrics(rawWithCurly, testId)).toBe("Hello world");
    expect(removeBumpFromRawLyrics(rawWithAngle, testId)).toBe("Hello world");
  });
});
