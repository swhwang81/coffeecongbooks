import { describe, expect, it } from "vitest";
import { generateShareToken } from "./share-token";

describe("generateShareToken", () => {
  it("defaults to 8 URL-safe base62 characters", () => {
    const token = generateShareToken();
    expect(token).toHaveLength(8);
    expect(token).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("respects a custom length", () => {
    expect(generateShareToken(16)).toHaveLength(16);
  });

  it("generates different tokens on each call (not deterministic/predictable)", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateShareToken()));
    // Astronomically unlikely to collide at 62^8 combinations — a failure here would mean the RNG is broken.
    expect(tokens.size).toBe(50);
  });
});
