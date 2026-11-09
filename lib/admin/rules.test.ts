import { describe, expect, it } from "vitest";
import { escapeRegex, getSuspensionBlocker, isRequestStuck, parsePage } from "./rules";

describe("getSuspensionBlocker", () => {
  const base = { actorId: "a", targetId: "b", targetIsActiveAdmin: false, activeAdminCount: 1 };

  it("allows suspending a regular user", () => {
    expect(getSuspensionBlocker(base)).toBeNull();
  });

  it("blocks suspending yourself", () => {
    expect(getSuspensionBlocker({ ...base, targetId: "a" })).toContain("propre compte");
  });

  it("blocks suspending the last active admin only", () => {
    expect(getSuspensionBlocker({ ...base, targetIsActiveAdmin: true })).toContain("dernier");
    expect(getSuspensionBlocker({ ...base, targetIsActiveAdmin: true, activeAdminCount: 2 })).toBeNull();
  });
});

describe("isRequestStuck", () => {
  const now = new Date("2026-11-20T00:00:00Z").getTime();

  it("flags an old open request", () => {
    expect(isRequestStuck("EN_COURS", new Date("2026-11-01T00:00:00Z"), now)).toBe(true);
  });

  it("ignores recent or finished requests", () => {
    expect(isRequestStuck("EN_COURS", new Date("2026-11-19T00:00:00Z"), now)).toBe(false);
    expect(isRequestStuck("CLOTUREE", new Date("2026-01-01T00:00:00Z"), now)).toBe(false);
  });
});

describe("helpers", () => {
  it("escapes regular expression characters", () => {
    expect(new RegExp(escapeRegex("a.b(c)")).test("a.b(c)")).toBe(true);
    expect(new RegExp(escapeRegex(".*")).test("abc")).toBe(false);
  });

  it("falls back to the first page on invalid input", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("-1")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });
});
