import { describe, expect, it } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("autorise jusqu'à la limite puis bloque", () => {
    const key = "test:limit";

    expect(checkRateLimit(key, { limit: 2, windowMs: 60_000 })).toBe(true);
    expect(checkRateLimit(key, { limit: 2, windowMs: 60_000 })).toBe(true);
    expect(checkRateLimit(key, { limit: 2, windowMs: 60_000 })).toBe(false);
  });

  it("réautorise après expiration de la fenêtre", async () => {
    const key = "test:reset";

    expect(checkRateLimit(key, { limit: 1, windowMs: 20 })).toBe(true);
    expect(checkRateLimit(key, { limit: 1, windowMs: 20 })).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(checkRateLimit(key, { limit: 1, windowMs: 20 })).toBe(true);
  });

  it("isole les clés entre elles", () => {
    expect(checkRateLimit("test:a", { limit: 1, windowMs: 60_000 })).toBe(true);
    expect(checkRateLimit("test:b", { limit: 1, windowMs: 60_000 })).toBe(true);
  });
});
