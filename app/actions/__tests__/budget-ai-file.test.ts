import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AiReceiptDraft } from "@/lib/ai/expense-draft";

const {
  generateTextMock,
  extractPdfTextMock,
  countDocumentsMock,
  checkRateLimitMock,
  runOcrMock,
  APICallErrorMock,
  NoObjectGeneratedErrorMock,
} = vi.hoisted(() => {
  class APICallErrorMock extends Error {
    statusCode?: number;

    static isInstance(error: unknown): boolean {
      return error instanceof APICallErrorMock;
    }
  }

  class NoObjectGeneratedErrorMock extends Error {
    static isInstance(error: unknown): boolean {
      return error instanceof NoObjectGeneratedErrorMock;
    }
  }

  return {
    generateTextMock: vi.fn(),
    extractPdfTextMock: vi.fn(),
    countDocumentsMock: vi.fn(),
    checkRateLimitMock: vi.fn(),
    runOcrMock: vi.fn(),
    APICallErrorMock,
    NoObjectGeneratedErrorMock,
  };
});

vi.mock("ai", () => ({
  generateText: generateTextMock,
  Output: { object: (spec: unknown) => spec },
  APICallError: APICallErrorMock,
  NoObjectGeneratedError: NoObjectGeneratedErrorMock,
}));

vi.mock("@/lib/ai/model", () => ({
  getExpenseModel: () => "mock-model",
}));

vi.mock("@/lib/budget/current-user", () => ({
  getUserId: async () => "user-1",
}));

vi.mock("@/models/expense", () => ({
  default: { countDocuments: countDocumentsMock },
}));

vi.mock("@/lib/ai/pdf-text", () => ({
  extractPdfText: extractPdfTextMock,
}));

vi.mock("@/lib/ai/ocr", () => ({
  runOcr: runOcrMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: checkRateLimitMock,
}));

import { parseExpenseFile } from "@/app/actions/budget-ai-file";

const JPEG_BYTES = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PDF_BYTES = Uint8Array.from([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34,
]);

function receiptDraft(
  overrides: Partial<AiReceiptDraft> = {},
): AiReceiptDraft {
  return {
    amountTnd: 85.5,
    dateIso: "2026-10-28",
    category: "ENERGIE",
    note: "Facture STEG",
    missingFields: [],
    confidence: "high",
    multipleExpenses: false,
    merchant: "STEG",
    amountBasis: "TTC",
    ...overrides,
  };
}

function apiCallError(
  statusCode: number,
): InstanceType<typeof APICallErrorMock> {
  const error = new APICallErrorMock(`HTTP ${statusCode}`);
  error.statusCode = statusCode;

  return error;
}

function fileForm(bytes: Uint8Array, name: string, type: string): FormData {
  const formData = new FormData();
  formData.append(
    "file",
    new File([new Uint8Array(bytes)], name, { type }),
  );

  return formData;
}

describe("parseExpenseFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AI_VISION;
    checkRateLimitMock.mockReturnValue(true);
    countDocumentsMock.mockResolvedValue(0);
    extractPdfTextMock.mockResolvedValue({ ok: false, reason: "no_text" });
    runOcrMock.mockResolvedValue({
      ok: true,
      text: "STEG Total a payer 85.500 DT",
    });
    generateTextMock.mockResolvedValue({ output: receiptDraft() });
  });

  it("envoie une image au modèle en vision sans filename", async () => {
    const state = await parseExpenseFile(
      null,
      fileForm(JPEG_BYTES, "recu.jpg", "image/jpeg"),
    );

    expect(state.success).toBe(true);
    expect(state.draft).toEqual({
      amount: "85,500",
      date: "2026-10-28",
      category: "ENERGIE",
      note: "Facture STEG",
    });

    const call = generateTextMock.mock.calls[0][0];
    const filePart = call.messages[0].content.find(
      (part: { type: string }) => part.type === "file",
    );

    expect(filePart).toEqual({
      type: "file",
      mediaType: "image/jpeg",
      data: JPEG_BYTES,
    });
    expect(filePart.filename).toBeUndefined();
    expect(call.instructions).toContain("TOTAL À PAYER TTC");
  });

  it("passe par le prompt texte pour un PDF avec couche texte", async () => {
    extractPdfTextMock.mockResolvedValue({
      ok: true,
      text: "STEG Total a payer 85.500 DT",
      pages: 1,
    });

    const state = await parseExpenseFile(
      null,
      fileForm(PDF_BYTES, "facture.pdf", "application/pdf"),
    );

    expect(state.success).toBe(true);

    const call = generateTextMock.mock.calls[0][0];

    expect(call.prompt).toContain("85.500");
    expect(call.messages).toBeUndefined();
  });

  it("envoie un PDF scanné vers la vision", async () => {
    extractPdfTextMock.mockResolvedValue({ ok: false, reason: "no_text" });

    const state = await parseExpenseFile(
      null,
      fileForm(PDF_BYTES, "scan.pdf", "application/pdf"),
    );

    expect(state.success).toBe(true);

    const call = generateTextMock.mock.calls[0][0];
    const filePart = call.messages[0].content.find(
      (part: { type: string }) => part.type === "file",
    );

    expect(filePart.mediaType).toBe("application/pdf");
  });

  it("refuse un fichier trop volumineux sans appeler le modèle", async () => {
    const oversized = new Uint8Array(5 * 1024 * 1024 + 1);
    const state = await parseExpenseFile(
      null,
      fileForm(oversized, "photo.jpg", "image/jpeg"),
    );

    expect(state).toEqual({
      success: false,
      message: "Fichier trop volumineux : 5 Mo maximum.",
    });
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("refuse un type menti (WAV renommé en .webp)", async () => {
    const wav = Uint8Array.from([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45,
    ]);
    const state = await parseExpenseFile(
      null,
      fileForm(wav, "recu.webp", "image/webp"),
    );

    expect(state.success).toBe(false);
    expect(state.message).toContain("Format non supporté");
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("signale spécifiquement un HEIC", async () => {
    const heic = Uint8Array.from([
      0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63,
    ]);
    const state = await parseExpenseFile(
      null,
      fileForm(heic, "photo.jpg", "image/jpeg"),
    );

    expect(state.message).toContain("HEIC");
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("bloque au-delà du rate limit (5/min)", async () => {
    checkRateLimitMock.mockReturnValue(false);

    const state = await parseExpenseFile(
      null,
      fileForm(JPEG_BYTES, "recu.jpg", "image/jpeg"),
    );

    expect(state).toEqual({
      success: false,
      message: "Trop de scans. Réessayez dans une minute.",
    });
    expect(checkRateLimitMock).toHaveBeenCalledWith(
      "ai-expense-file:user-1",
      { limit: 5, windowMs: 60_000 },
    );
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("signale un doublon possible (même montant, même date)", async () => {
    countDocumentsMock.mockResolvedValue(1);

    const state = await parseExpenseFile(
      null,
      fileForm(JPEG_BYTES, "recu.jpg", "image/jpeg"),
    );

    expect(state.success).toBe(true);
    expect(state.possibleDuplicate).toBe(true);
  });

  it("traduit un refus du post-traitement en message clair", async () => {
    generateTextMock.mockResolvedValue({
      output: receiptDraft({
        amountTnd: null,
        missingFields: ["amountTnd", "dateIso", "category"],
        confidence: "low",
      }),
    });

    const state = await parseExpenseFile(
      null,
      fileForm(JPEG_BYTES, "recu.jpg", "image/jpeg"),
    );

    expect(state.success).toBe(false);
    expect(state.message).toContain("Aucune dépense lisible");
  });

  it("passe par l'OCR local quand la vision est désactivée (Phase 2)", async () => {
    process.env.AI_VISION = "false";

    const state = await parseExpenseFile(
      null,
      fileForm(JPEG_BYTES, "recu.jpg", "image/jpeg"),
    );

    expect(state.success).toBe(true);
    expect(runOcrMock).toHaveBeenCalledTimes(1);

    const call = generateTextMock.mock.calls[0][0];

    expect(call.prompt).toContain("85.500");
    expect(call.messages).toBeUndefined();
  });

  it("traduit un échec d'OCR en message clair", async () => {
    process.env.AI_VISION = "false";
    runOcrMock.mockResolvedValue({ ok: false, reason: "no_text" });

    const state = await parseExpenseFile(
      null,
      fileForm(JPEG_BYTES, "recu.jpg", "image/jpeg"),
    );

    expect(state.success).toBe(false);
    expect(state.message).toContain("Aucun texte lisible");
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("traduit un timeout du modèle en message clair", async () => {
    generateTextMock.mockRejectedValue(
      Object.assign(new Error("timed out"), { name: "TimeoutError" }),
    );

    const state = await parseExpenseFile(
      null,
      fileForm(JPEG_BYTES, "recu.jpg", "image/jpeg"),
    );

    expect(state.success).toBe(false);
    expect(state.message).toContain("trop de temps");
  });

  it("traduit un 401 du fournisseur en erreur de clé API", async () => {
    generateTextMock.mockRejectedValueOnce(apiCallError(401));

    const state = await parseExpenseFile(
      null,
      fileForm(JPEG_BYTES, "recu.jpg", "image/jpeg"),
    );

    expect(state.success).toBe(false);
    expect(state.message).toContain("GOOGLE_GENERATIVE_AI_API_KEY");
  });

  it("traduit un 403 du fournisseur en clé non autorisée", async () => {
    generateTextMock.mockRejectedValueOnce(apiCallError(403));

    const state = await parseExpenseFile(
      null,
      fileForm(JPEG_BYTES, "recu.jpg", "image/jpeg"),
    );

    expect(state.success).toBe(false);
    expect(state.message).toContain("non autorisée");
  });

  it("traduit un 404 du fournisseur en modèle indisponible", async () => {
    generateTextMock.mockRejectedValueOnce(apiCallError(404));

    const state = await parseExpenseFile(
      null,
      fileForm(JPEG_BYTES, "recu.jpg", "image/jpeg"),
    );

    expect(state.success).toBe(false);
    expect(state.message).toContain("AI_MODEL");
  });

  it("traduit un 429 du fournisseur en quota atteint", async () => {
    generateTextMock.mockRejectedValueOnce(apiCallError(429));

    const state = await parseExpenseFile(
      null,
      fileForm(JPEG_BYTES, "recu.jpg", "image/jpeg"),
    );

    expect(state.success).toBe(false);
    expect(state.message).toContain("Quota IA atteint");
  });

  it("propage un PDF trop long sans appeler le modèle", async () => {
    extractPdfTextMock.mockResolvedValue({
      ok: false,
      reason: "too_many_pages",
    });

    const state = await parseExpenseFile(
      null,
      fileForm(PDF_BYTES, "facture.pdf", "application/pdf"),
    );

    expect(state.message).toContain("10 pages maximum");
    expect(generateTextMock).not.toHaveBeenCalled();
  });
});
