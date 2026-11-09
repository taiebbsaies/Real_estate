import { describe, expect, it } from "vitest";
import { chooseExtractionRoute } from "@/lib/ai/receipt-route";

describe("chooseExtractionRoute", () => {
  it("envoie un PDF avec couche texte vers le pipeline texte", () => {
    expect(
      chooseExtractionRoute({
        kind: "application/pdf",
        pdfHasText: true,
        visionEnabled: true,
        ocrEnabled: false,
      }),
    ).toEqual({ route: "pdf-text" });
  });

  it("envoie un PDF scanné vers la vision quand elle est active", () => {
    expect(
      chooseExtractionRoute({
        kind: "application/pdf",
        pdfHasText: false,
        visionEnabled: true,
        ocrEnabled: false,
      }),
    ).toEqual({ route: "vision" });
  });

  it("envoie une image vers la vision quand elle est active", () => {
    for (const kind of ["image/jpeg", "image/png", "image/webp"] as const) {
      expect(
        chooseExtractionRoute({
          kind,
          pdfHasText: null,
          visionEnabled: true,
          ocrEnabled: false,
        }),
      ).toEqual({ route: "vision" });
    }
  });

  it("rejette une image sans vision ni OCR (Phase 1, AI_VISION=false)", () => {
    expect(
      chooseExtractionRoute({
        kind: "image/jpeg",
        pdfHasText: null,
        visionEnabled: false,
        ocrEnabled: false,
      }),
    ).toEqual({ route: "rejected", reason: "ocr_unavailable" });
  });

  it("envoie une image vers l'OCR quand la vision est désactivée (Phase 2)", () => {
    expect(
      chooseExtractionRoute({
        kind: "image/png",
        pdfHasText: null,
        visionEnabled: false,
        ocrEnabled: true,
      }),
    ).toEqual({ route: "ocr-text" });
  });

  it("rejette un PDF scanné sans vision même avec OCR (tesseract ne lit pas les PDF)", () => {
    expect(
      chooseExtractionRoute({
        kind: "application/pdf",
        pdfHasText: false,
        visionEnabled: false,
        ocrEnabled: true,
      }),
    ).toEqual({ route: "rejected", reason: "scanned_pdf_no_ocr" });
  });
});
