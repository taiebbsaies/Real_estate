"use server";

import {
  APICallError,
  generateText,
  NoObjectGeneratedError,
  Output,
} from "ai";
import { getUserId } from "@/lib/budget/current-user";
import { tndToMillimes } from "@/lib/budget/calculations";
import { getExpenseModel } from "@/lib/ai/model";
import {
  aiReceiptDraftSchema,
  toReceiptDraft,
  type AiReceiptDraft,
} from "@/lib/ai/expense-draft";
import { buildReceiptInstructions } from "@/lib/ai/receipt-prompt";
import { validateUpload } from "@/lib/ai/file-sniff";
import { extractPdfText } from "@/lib/ai/pdf-text";
import { chooseExtractionRoute } from "@/lib/ai/receipt-route";
import { runOcr } from "@/lib/ai/ocr";
import { checkRateLimit } from "@/lib/rate-limit";
import type { ExpenseDraftActionState } from "@/app/actions/budget-ai";
import Expense from "@/models/expense";

export type ExpenseFileActionState = ExpenseDraftActionState & {
  possibleDuplicate?: boolean;
};

const REJECTION_MESSAGES = {
  not_an_expense:
    "Aucune dépense lisible dans ce justificatif. Remplissez le formulaire ci-dessous.",
  amount_missing:
    "Aucun montant détecté sur le justificatif. Remplissez le formulaire ci-dessous.",
  amount_invalid:
    "Le montant extrait est invalide. Remplissez le formulaire ci-dessous.",
} as const;

const UPLOAD_ERRORS = {
  empty: "Fichier vide. Choisissez une photo ou un PDF.",
  too_large: "Fichier trop volumineux : 5 Mo maximum.",
  unsupported_heic:
    "Format HEIC non supporté. Convertissez la photo en JPG ou prenez-la directement dans l'application.",
  unsupported: "Format non supporté. Utilisez JPG, PNG, WebP ou PDF.",
  missing: "Aucun fichier reçu. Réessayez.",
} as const;

const PDF_ERRORS = {
  invalid: "PDF illisible. Réessayez avec une photo ou un autre PDF.",
  too_many_pages: "PDF trop long : 10 pages maximum.",
  timeout: "L'analyse du PDF prend trop de temps. Réessayez.",
} as const;

const ROUTE_ERRORS = {
  ocr_unavailable:
    "L'analyse d'images est désactivée sur ce serveur (AI_VISION=false). Remplissez le formulaire ci-dessous.",
  scanned_pdf_no_ocr:
    "PDF scanné illisible sans analyse visuelle (AI_VISION=false). Prenez-le en photo ou activez AI_VISION.",
} as const;

const OCR_ERRORS = {
  too_large: "Image trop grande. Réessayez avec une photo plus petite.",
  preprocess_failed:
    "Image illisible. Réessayez avec une autre photo ou remplissez le formulaire.",
  ocr_failed:
    "La reconnaissance de texte a échoué. Réessayez ou remplissez le formulaire.",
  timeout:
    "La reconnaissance de texte prend trop de temps. Réessayez.",
  no_text:
    "Aucun texte lisible dans cette image. Réessayez avec une photo plus nette ou remplissez le formulaire.",
} as const;

const VISION_TIMEOUT_MS = 20_000;
const TEXT_TIMEOUT_MS = 15_000;
const OCR_ENABLED = true;

function isVisionEnabled(): boolean {
  return process.env.AI_VISION !== "false";
}

async function findPossibleDuplicate(
  userId: string,
  millimes: number,
  dateIso: string,
): Promise<boolean> {
  const start = new Date(`${dateIso}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const count = await Expense.countDocuments({
    userId,
    amount: millimes,
    date: { $gte: start, $lt: end },
  });

  return count > 0;
}

export async function parseExpenseFile(
  _previousState: ExpenseFileActionState | null,
  formData: FormData,
): Promise<ExpenseFileActionState> {
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { success: false, message: UPLOAD_ERRORS.missing };
  }

  const userId = await getUserId();

  if (
    !checkRateLimit(`ai-expense-file:${userId}`, {
      limit: 5,
      windowMs: 60_000,
    })
  ) {
    return { success: false, message: "Trop de scans. Réessayez dans une minute." };
  }

  const validation = await validateUpload(file);

  if (!validation.ok) {
    if (validation.reason === "unsupported" && validation.heic) {
      return { success: false, message: UPLOAD_ERRORS.unsupported_heic };
    }

    const message =
      validation.reason === "empty"
        ? UPLOAD_ERRORS.empty
        : validation.reason === "too_large"
          ? UPLOAD_ERRORS.too_large
          : UPLOAD_ERRORS.unsupported;

    return { success: false, message };
  }

  let pdfText: string | null = null;

  if (validation.kind === "application/pdf") {
    const pdf = await extractPdfText(validation.bytes);

    if (pdf.ok) {
      pdfText = pdf.text;
    } else if (pdf.reason !== "no_text") {
      return { success: false, message: PDF_ERRORS[pdf.reason] };
    }
  }

  const decision = chooseExtractionRoute({
    kind: validation.kind,
    pdfHasText: pdfText !== null,
    visionEnabled: isVisionEnabled(),
    ocrEnabled: OCR_ENABLED,
  });

  if (decision.route === "rejected") {
    return { success: false, message: ROUTE_ERRORS[decision.reason] };
  }

  const now = new Date();

  try {
    let output: AiReceiptDraft;

    if (decision.route === "ocr-text") {
      const ocr = await runOcr(validation.bytes);

      if (!ocr.ok) {
        return { success: false, message: OCR_ERRORS[ocr.reason] };
      }

      const result = await generateText({
        model: getExpenseModel(),
        output: Output.object({
          schema: aiReceiptDraftSchema,
          name: "ExpenseReceiptDraft",
        }),
        instructions: buildReceiptInstructions(now),
        prompt: ocr.text,
        abortSignal: AbortSignal.timeout(TEXT_TIMEOUT_MS),
      });
      output = result.output;
    } else if (decision.route === "pdf-text" && pdfText !== null) {
      const result = await generateText({
        model: getExpenseModel(),
        output: Output.object({
          schema: aiReceiptDraftSchema,
          name: "ExpenseReceiptDraft",
        }),
        instructions: buildReceiptInstructions(now),
        prompt: pdfText,
        abortSignal: AbortSignal.timeout(TEXT_TIMEOUT_MS),
      });
      output = result.output;
    } else {
      const result = await generateText({
        model: getExpenseModel(),
        output: Output.object({
          schema: aiReceiptDraftSchema,
          name: "ExpenseReceiptDraft",
        }),
        instructions: buildReceiptInstructions(now),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extrais la dépense de ce justificatif.",
              },
              {
                type: "file",
                mediaType: validation.kind,
                data: validation.bytes,
              },
            ],
          },
        ],
        abortSignal: AbortSignal.timeout(VISION_TIMEOUT_MS),
      });
      output = result.output;
    }

    const result = toReceiptDraft(output, now);

    if (!result.ok) {
      return {
        success: false,
        message: REJECTION_MESSAGES[result.reason],
        errors: { amount: ["Montant manquant ou invalide."] },
      };
    }

    const millimes =
      output.amountTnd !== null ? tndToMillimes(output.amountTnd) : Number.NaN;
    const possibleDuplicate = Number.isInteger(millimes) && millimes > 0
      ? await findPossibleDuplicate(userId, millimes, result.draft.date)
      : false;

    return {
      success: true,
      message: "Brouillon généré — vérifiez avant d'enregistrer.",
      draft: {
        amount: result.draft.amount,
        date: result.draft.date,
        category: result.draft.category,
        note: result.draft.note,
      },
      uncertainFields: result.draft.uncertainFields,
      multipleExpenses: result.draft.multipleExpenses,
      possibleDuplicate,
    };
  } catch (error: unknown) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return {
        success: false,
        message:
          "Extraction impossible. Réessayez avec une photo plus nette ou remplissez le formulaire.",
      };
    }

    if (APICallError.isInstance(error)) {
      console.error("parseExpenseFile APICallError:", error.statusCode);

      if (error.statusCode === 401 || error.statusCode === 403) {
        return {
          success: false,
          message:
            "La clé API Google semble invalide ou non autorisée. Vérifiez GOOGLE_GENERATIVE_AI_API_KEY dans .env.local.",
        };
      }

      if (error.statusCode === 404) {
        return {
          success: false,
          message:
            "Le modèle IA configuré est indisponible. Vérifiez AI_MODEL dans .env.local.",
        };
      }

      if (error.statusCode === 429) {
        return {
          success: false,
          message: "Quota IA atteint. Réessayez dans quelques minutes.",
        };
      }

      return {
        success: false,
        message:
          "Le service IA est indisponible. Remplissez le formulaire ci-dessous.",
      };
    }

    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        success: false,
        message: "L'analyse prend trop de temps. Réessayez.",
      };
    }

    console.error(
      "parseExpenseFile failed:",
      error instanceof Error ? error.name : error,
    );

    return {
      success: false,
      message:
        "Le service IA est indisponible. Remplissez le formulaire ci-dessous.",
    };
  }
}
