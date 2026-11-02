import { describe, expect, it } from "vitest";
import {
  extractPdfText,
  MAX_PDF_PAGES,
  MIN_PDF_TEXT_CHARS,
} from "@/lib/ai/pdf-text";

function escapePdfText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function buildPdf(pageTexts: string[]): Uint8Array {
  const chunks: string[] = ["%PDF-1.4\n"];
  const offsets: number[] = [];
  let position = 8;
  const pageCount = pageTexts.length;
  const fontId = 3 + pageCount * 2;
  const kids = pageTexts
    .map((_, index) => `${3 + index * 2} 0 R`)
    .join(" ");

  function addObject(id: number, body: string): void {
    offsets[id] = position;
    const chunk = `${id} 0 obj\n${body}\nendobj\n`;
    chunks.push(chunk);
    position += chunk.length;
  }

  addObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  addObject(2, `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`);

  pageTexts.forEach((text, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const stream = `BT /F1 12 Tf 72 720 Td (${escapePdfText(text)}) Tj ET`;

    addObject(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
        `/Resources << /Font << /F1 ${fontId} 0 R >> >> ` +
        `/Contents ${contentId} 0 R >>`,
    );
    addObject(
      contentId,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    );
  });

  addObject(
    fontId,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  );

  const xrefPosition = position;
  let xref = `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;

  for (let id = 1; id <= fontId; id += 1) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }

  const trailer =
    `trailer\n<< /Size ${fontId + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefPosition}\n%%EOF\n`;

  return Uint8Array.from(
    Buffer.from(chunks.join("") + xref + trailer, "latin1"),
  );
}

const INVOICE_TEXT =
  "STEG Societe Tunisienne de l'Electricite et du Gaz Facture N 245- " +
  "Total a payer 85.500 DT Merci de votre fidelite";

describe("extractPdfText", () => {
  it("extrait le texte d'un PDF avec couche texte", async () => {
    const result = await extractPdfText(buildPdf([INVOICE_TEXT]));

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.text).toContain("85.500");
      expect(result.pages).toBe(1);
    }
  });

  it("traite un PDF scanné (presque vide) comme sans texte", async () => {
    const result = await extractPdfText(buildPdf(["STAMP"]));

    expect(result).toEqual({ ok: false, reason: "no_text" });
  });

  it("applique le seuil de caractères utiles sur le texte non blanc", async () => {
    const padded = "   ".repeat(50) + "x".repeat(MIN_PDF_TEXT_CHARS - 1);
    const result = await extractPdfText(buildPdf([padded]));

    expect(result).toEqual({ ok: false, reason: "no_text" });
  });

  it("refuse un PDF de plus de 10 pages", async () => {
    const pages = Array.from(
      { length: MAX_PDF_PAGES + 1 },
      () => INVOICE_TEXT,
    );
    const result = await extractPdfText(buildPdf(pages));

    expect(result).toEqual({ ok: false, reason: "too_many_pages" });
  });

  it("refuse des octets qui ne sont pas un PDF valide (raison exacte)", async () => {
    const garbage = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0xff, 0xff, 0xff, 0x00, 0x01]);
    const result = await extractPdfText(garbage);

    expect(result).toEqual({ ok: false, reason: "invalid" });
  });
});
