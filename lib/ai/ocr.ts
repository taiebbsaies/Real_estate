import "server-only";

import path from "node:path";
import { createWorker } from "tesseract.js";
import sharp from "sharp";

export const MIN_OCR_TEXT_CHARS = 80;
export const MAX_OCR_TEXT_CHARS = 20_000;

const OCR_TIMEOUT_MS = 60_000;
const MAX_OCR_PIXELS = 8000 * 8000;
const MAX_OCR_DIMENSION = 2000;

export type OcrResult =
  | { ok: true; text: string }
  | {
      ok: false;
      reason:
        | "too_large"
        | "preprocess_failed"
        | "ocr_failed"
        | "timeout"
        | "no_text";
    };

type OcrWorker = Awaited<ReturnType<typeof createWorker>>;

let workerPromise: Promise<OcrWorker> | null = null;

function getWorker(): Promise<OcrWorker> {
  if (!workerPromise) {
    workerPromise = createWorker("fra+eng+ara", 1, {
      langPath: path.join(process.cwd(), "resources", "tessdata"),
      cacheMethod: "none",
    }).catch((error: unknown) => {
      workerPromise = null;
      throw error;
    });
  }

  return workerPromise;
}

async function resetWorker(): Promise<void> {
  const promise = workerPromise;
  workerPromise = null;

  if (!promise) {
    return;
  }

  const worker = await promise.catch(() => null);

  if (worker) {
    await worker.terminate().catch(() => {});
  }
}

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("ocr_timeout")), OCR_TIMEOUT_MS);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

async function preprocess(
  bytes: Uint8Array,
): Promise<
  { ok: true; bytes: Uint8Array } | { ok: false; reason: "too_large" | "preprocess_failed" }
> {
  try {
    const image = sharp(bytes, {
      failOn: "none",
      limitInputPixels: MAX_OCR_PIXELS,
    });
    const metadata = await image.metadata();
    const pixels = (metadata.width ?? 0) * (metadata.height ?? 0);

    if (pixels > MAX_OCR_PIXELS) {
      return { ok: false, reason: "too_large" };
    }

    const buffer = await image
      .rotate()
      .grayscale()
      .normalize()
      .resize({
        width: MAX_OCR_DIMENSION,
        height: MAX_OCR_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .png()
      .toBuffer();

    return { ok: true, bytes: new Uint8Array(buffer) };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("pixel limit")
    ) {
      return { ok: false, reason: "too_large" };
    }

    return { ok: false, reason: "preprocess_failed" };
  }
}

export async function runOcr(bytes: Uint8Array): Promise<OcrResult> {
  const prepared = await preprocess(bytes);

  if (!prepared.ok) {
    return { ok: false, reason: prepared.reason };
  }

  try {
    const worker = await getWorker();
    const { data } = await withTimeout(
      worker.recognize(Buffer.from(prepared.bytes)),
    );
    const text = (data.text ?? "").slice(0, MAX_OCR_TEXT_CHARS);

    if (text.replace(/\s+/g, "").length < MIN_OCR_TEXT_CHARS) {
      return { ok: false, reason: "no_text" };
    }

    return { ok: true, text };
  } catch (error) {
    void resetWorker();

    if (error instanceof Error && error.message === "ocr_timeout") {
      return { ok: false, reason: "timeout" };
    }

    return { ok: false, reason: "ocr_failed" };
  }
}
