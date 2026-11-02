import { extractText, getDocumentProxy } from "unpdf";

export const MAX_PDF_PAGES = 10;
export const MIN_PDF_TEXT_CHARS = 80;
export const MAX_PDF_TEXT_CHARS = 20_000;
const PDF_TIMEOUT_MS = 10_000;

export type PdfTextResult =
  | { ok: true; text: string; pages: number }
  | {
      ok: false;
      reason: "invalid" | "no_text" | "too_many_pages" | "timeout";
    };

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("pdf_timeout")),
      PDF_TIMEOUT_MS,
    );
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.message === "pdf_timeout";
}

export async function extractPdfText(bytes: Uint8Array): Promise<PdfTextResult> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;

  try {
    pdf = await withTimeout(getDocumentProxy(bytes));
  } catch {
    return { ok: false, reason: "invalid" };
  }

  try {
    if (pdf.numPages > MAX_PDF_PAGES) {
      return { ok: false, reason: "too_many_pages" };
    }

    const { text } = await withTimeout(
      extractText(pdf, { mergePages: true }),
    );
    const merged = Array.isArray(text) ? text.join("\n") : text;
    const usefulChars = merged.replace(/\s+/g, "").length;

    if (usefulChars < MIN_PDF_TEXT_CHARS) {
      return { ok: false, reason: "no_text" };
    }

    return {
      ok: true,
      text: merged.slice(0, MAX_PDF_TEXT_CHARS),
      pages: pdf.numPages,
    };
  } catch (error) {
    return { ok: false, reason: isTimeout(error) ? "timeout" : "invalid" };
  } finally {
    if (typeof pdf.cleanup === "function") {
      void Promise.resolve(pdf.cleanup()).catch(() => {});
    }
  }
}
