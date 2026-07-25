import { describe, it, expect } from "vitest";
import { sanitize } from "../sanitize";

describe("sanitize", () => {
  it("converts legacy <cueId=...=cueId> to {cueId=...=cueId}", () => {
    const input = "Hello <cueId=1234_5678=cueId>world";
    const result = sanitize(input);
    expect(result).toBe("Hello {cueId=1234_5678=cueId}world");
  });

  it("converts legacy <bumpId=...=bumpId> to {bumpId=...=bumpId}", () => {
    const input = "Hello <bumpId=8765_4321=bumpId>world";
    const result = sanitize(input);
    expect(result).toBe("Hello {bumpId=8765_4321=bumpId}world");
  });

  it("strips unauthorized HTML script tags while retaining allowed sub/sup tags", () => {
    const input = "Lyric <script>alert(1)</script><sub>subtext</sub> <sup>suptext</sup>";
    const result = sanitize(input);
    expect(result).toBe("Lyric <sub>subtext</sub> <sup>suptext</sup>");
  });
});
