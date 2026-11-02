import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { runOcr } from "@/lib/ai/ocr";

describe("runOcr", () => {
  it(
    "refuse une image dépassant la limite de pixels sans la décoder",
    async () => {
      const png = await sharp({
        create: {
          width: 9000,
          height: 9000,
          channels: 3,
          background: "white",
        },
      })
        .png()
        .toBuffer();

      const result = await runOcr(new Uint8Array(png));

      expect(result).toEqual({ ok: false, reason: "too_large" });
    },
    60_000,
  );
});
