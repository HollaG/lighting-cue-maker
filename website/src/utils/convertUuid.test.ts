import { describe, expect, test } from "vitest";
import { expandUUID, shortenUUID } from "./convertUuid";

describe("convertUuid", () => {
  test("shortenUUID and expandUUID round-trip for 10 random UUIDs", () => {
    for (let i = 0; i < 10; i++) {
      const originalUuid = crypto.randomUUID();

      const shortId = shortenUUID(originalUuid);

      // Verify length is exactly 22 characters
      expect(shortId).toHaveLength(22);

      // Verify no hyphens or spaces
      expect(shortId).not.toContain("-");
      expect(shortId).not.toContain(" ");

      // Verify round-trip conversion yields identical UUID
      const expandedUuid = expandUUID(shortId);
      expect(expandedUuid).toBe(originalUuid);
    }
  });
});
