import { describe, it, expect } from "vitest";
import {
  insertCueInRichContent,
  getCueOrder,
  removeCueFromRawLyrics,
  CUE_START,
  CUE_END,
} from "../cueUtils";

describe("cueUtils", () => {
  it("constants use curly braces", () => {
    expect(CUE_START).toBe("{cueId=");
    expect(CUE_END).toBe("=cueId}");
  });

  it("insertCueInRichContent inserts {cueId=...=cueId} into word", () => {
    const initialContent = [["hello", "world"]];
    const testId = "12345678-1234-1234-1234-123456789abc";
    const result = insertCueInRichContent(testId, 0, 0, false, initialContent);

    expect(result[0][0]).toContain("{cueId=");
    expect(result[0][0]).toContain("=cueId}hello");
    expect(result[0][0]).not.toContain("<cueId=");
  });

  it("insertCueInRichContent inserts {cueId=...=cueId} into space", () => {
    const initialContent = [["hello", " ", "world"]];
    const testId = "12345678-1234-1234-1234-123456789abc";
    const result = insertCueInRichContent(testId, 0, 1, true, initialContent);

    expect(result[0]).toContain("{cueId=12345678_1234_1234_1234_123456789abc=cueId}");
  });

  it("getCueOrder parses both {cueId=...=cueId} and legacy <cueId=...=cueId>", () => {
    const rawLyrics =
      "Hello {cueId=11111111_1111_1111_1111_111111111111=cueId}world <cueId=22222222_2222_2222_2222_222222222222=cueId>test";
    const order = getCueOrder(rawLyrics);

    expect(order).toEqual([
      "11111111-1111-1111-1111-111111111111",
      "22222222-2222-2222-2222-222222222222",
    ]);
  });

  it("removeCueFromRawLyrics removes curly and legacy angle cue tags", () => {
    const testId = "12345678-1234-1234-1234-123456789abc";
    const rawWithCurly = "Hello {cueId=12345678_1234_1234_1234_123456789abc=cueId}world";
    const rawWithAngle = "Hello <cueId=12345678_1234_1234_1234_123456789abc=cueId>world";

    expect(removeCueFromRawLyrics(rawWithCurly, testId)).toBe("Hello world");
    expect(removeCueFromRawLyrics(rawWithAngle, testId)).toBe("Hello world");
  });
});
