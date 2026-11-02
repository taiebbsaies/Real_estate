import { describe, expect, it } from "vitest";
import {
  detectFileKind,
  looksLikeHeic,
  MAX_FILE_BYTES,
  validateUpload,
} from "@/lib/ai/file-sniff";

const JPEG_BYTES = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_BYTES = Uint8Array.of(
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52,
);
const WEBP_BYTES = Uint8Array.from([
  ...[0x52, 0x49, 0x46, 0x46],
  0x00, 0x00, 0x00, 0x00,
  ...[0x57, 0x45, 0x42, 0x50],
]);
const PDF_BYTES = Uint8Array.from([
  ...[0x25, 0x50, 0x44, 0x46, 0x2d],
  0x31, 0x2e, 0x34,
]);
const WAV_BYTES = Uint8Array.from([
  ...[0x52, 0x49, 0x46, 0x46],
  0x00, 0x00, 0x00, 0x00,
  ...[0x57, 0x41, 0x56, 0x45],
]);
const AVI_BYTES = Uint8Array.from([
  ...[0x52, 0x49, 0x46, 0x46],
  0x00, 0x00, 0x00, 0x00,
  ...[0x41, 0x56, 0x49, 0x20],
]);
const HEIC_BYTES = Uint8Array.from([
  0x00, 0x00, 0x00, 0x18,
  ...[0x66, 0x74, 0x79, 0x70],
  ...[0x68, 0x65, 0x69, 0x63],
]);

function textBytes(text: string): Uint8Array {
  return Uint8Array.from([...text].map((char) => char.charCodeAt(0)));
}

describe("detectFileKind", () => {
  it("reconnaît un JPEG", () => {
    expect(detectFileKind(JPEG_BYTES)).toBe("image/jpeg");
  });

  it("reconnaît un PNG avec son en-tête IHDR", () => {
    expect(detectFileKind(PNG_BYTES)).toBe("image/png");
  });

  it("reconnaît un WebP (RIFF + WEBP aux octets 8 à 11)", () => {
    expect(detectFileKind(WEBP_BYTES)).toBe("image/webp");
  });

  it("reconnaît un PDF", () => {
    expect(detectFileKind(PDF_BYTES)).toBe("application/pdf");
  });

  it("rejette un RIFF sans marqueur WEBP (WAV, AVI)", () => {
    expect(detectFileKind(WAV_BYTES)).toBeNull();
    expect(detectFileKind(AVI_BYTES)).toBeNull();
  });

  it("rejette un fichier vide ou trop court", () => {
    expect(detectFileKind(new Uint8Array(0))).toBeNull();
    expect(detectFileKind(Uint8Array.from([0xff, 0xd8]))).toBeNull();
  });

  it("rejette un texte renommé en .jpg", () => {
    expect(detectFileKind(textBytes("ceci n'est pas une image"))).toBeNull();
  });
});

describe("looksLikeHeic", () => {
  it("reconnaît une photo HEIC (ftyp + heic)", () => {
    expect(looksLikeHeic(HEIC_BYTES)).toBe(true);
  });

  it("rejette un JPEG ou un fichier court", () => {
    expect(looksLikeHeic(JPEG_BYTES)).toBe(false);
    expect(looksLikeHeic(new Uint8Array(4))).toBe(false);
  });
});

describe("validateUpload", () => {
  it("valide un JPEG et retourne ses octets", async () => {
    const file = new File([JPEG_BYTES], "recu.jpg", { type: "image/jpeg" });
    const result = await validateUpload(file);

    expect(result).toEqual({
      ok: true,
      bytes: JPEG_BYTES,
      kind: "image/jpeg",
    });
  });

  it("refuse un fichier vide avant de lire les octets", async () => {
    const file = new File([new Uint8Array(0)], "recu.jpg", {
      type: "image/jpeg",
    });
    const result = await validateUpload(file);

    expect(result).toEqual({ ok: false, reason: "empty" });
  });

  it("refuse un fichier trop volumineux avant de lire les octets", async () => {
    const oversized = new Uint8Array(MAX_FILE_BYTES + 1);
    const file = new File([oversized], "photo.jpg", { type: "image/jpeg" });
    const result = await validateUpload(file);

    expect(result).toEqual({ ok: false, reason: "too_large" });
  });

  it("refuse un WAV renommé en .webp", async () => {
    const file = new File([WAV_BYTES], "recu.webp", { type: "image/webp" });
    const result = await validateUpload(file);

    expect(result).toEqual({ ok: false, reason: "unsupported", heic: false });
  });

  it("signale spécifiquement un HEIC refusé", async () => {
    const file = new File([HEIC_BYTES], "photo.jpg", { type: "image/jpeg" });
    const result = await validateUpload(file);

    expect(result).toEqual({ ok: false, reason: "unsupported", heic: true });
  });
});
