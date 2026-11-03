export type SupportedFileKind =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "application/pdf";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export type UploadValidation =
  | { ok: true; bytes: Uint8Array; kind: SupportedFileKind }
  | { ok: false; reason: "empty" | "too_large" }
  | { ok: false; reason: "unsupported"; heic: boolean };

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const PNG_IHDR = [0x49, 0x48, 0x44, 0x52];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_SIGNATURE = [0x57, 0x45, 0x42, 0x50];
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
const HEIC_BRANDS = ["heic", "heix", "heim", "heis", "mif1", "msf1", "hevc"];

function matches(bytes: Uint8Array, offset: number, signature: number[]): boolean {
  if (bytes.length < offset + signature.length) {
    return false;
  }

  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

export function detectFileKind(bytes: Uint8Array): SupportedFileKind | null {
  if (matches(bytes, 0, PDF_SIGNATURE)) {
    return "application/pdf";
  }

  if (matches(bytes, 0, JPEG_SIGNATURE)) {
    return "image/jpeg";
  }

  if (matches(bytes, 0, PNG_SIGNATURE) && matches(bytes, 12, PNG_IHDR)) {
    return "image/png";
  }

  if (matches(bytes, 0, RIFF_SIGNATURE) && matches(bytes, 8, WEBP_SIGNATURE)) {
    return "image/webp";
  }

  return null;
}

export function looksLikeHeic(bytes: Uint8Array): boolean {
  if (bytes.length < 12 || ascii(bytes, 4, 8) !== "ftyp") {
    return false;
  }

  return HEIC_BRANDS.includes(ascii(bytes, 8, 12));
}

export async function validateUpload(file: File): Promise<UploadValidation> {
  if (file.size === 0) {
    return { ok: false, reason: "empty" };
  }

  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: "too_large" };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectFileKind(bytes);

  if (!kind) {
    return { ok: false, reason: "unsupported", heic: looksLikeHeic(bytes) };
  }

  return { ok: true, bytes, kind };
}
