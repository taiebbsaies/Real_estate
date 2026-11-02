import type { SupportedFileKind } from "@/lib/ai/file-sniff";

export type ExtractionRoute = "pdf-text" | "vision" | "ocr-text";

export type RouteDecision =
  | { route: ExtractionRoute }
  | { route: "rejected"; reason: "ocr_unavailable" | "scanned_pdf_no_ocr" };

export function chooseExtractionRoute(input: {
  kind: SupportedFileKind;
  pdfHasText: boolean | null;
  visionEnabled: boolean;
  ocrEnabled: boolean;
}): RouteDecision {
  if (input.kind === "application/pdf") {
    if (input.pdfHasText) {
      return { route: "pdf-text" };
    }

    if (input.visionEnabled) {
      return { route: "vision" };
    }

    return { route: "rejected", reason: "scanned_pdf_no_ocr" };
  }

  if (input.visionEnabled) {
    return { route: "vision" };
  }

  if (input.ocrEnabled) {
    return { route: "ocr-text" };
  }

  return { route: "rejected", reason: "ocr_unavailable" };
}
