"use server";

import {
  APICallError,
  generateText,
  NoObjectGeneratedError,
  Output,
} from "ai";
import { z, type ZodError } from "zod";
import { getUserId } from "@/lib/budget/current-user";
import type { BudgetCategory } from "@/lib/constants/budget";
import { getExpenseModel } from "@/lib/ai/model";
import { aiExpenseDraftSchema, toExpenseDraft } from "@/lib/ai/expense-draft";
import { buildExpenseInstructions } from "@/lib/ai/expense-prompt";
import { checkRateLimit } from "@/lib/rate-limit";

export type ExpenseDraftActionState = {
  success: boolean;
  message: string;
  draft?: {
    amount: string;
    date: string;
    category: BudgetCategory;
    note: string;
  };
  uncertainFields?: string[];
  multipleExpenses?: boolean;
  errors?: Record<string, string[]>;
};

const inputSchema = z.object({
  text: z
    .string()
    .trim()
    .min(3, "Décrivez votre dépense en quelques mots.")
    .max(300, "La description ne doit pas dépasser 300 caractères."),
});

const REJECTION_MESSAGES = {
  not_an_expense:
    "Ceci ne décrit pas une dépense. Essayez par exemple : « 85 dinars d'électricité hier ».",
  amount_missing:
    "Aucun montant détecté. Précisez-le (ex. « 85 dinars ») ou remplissez le formulaire ci-dessous.",
  amount_invalid:
    "Le montant extrait est invalide. Remplissez le formulaire ci-dessous.",
} as const;

function fieldErrors(error: ZodError): Record<string, string[]> {
  const errors = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(errors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );
}

export async function parseExpenseText(
  _previousState: ExpenseDraftActionState | null,
  formData: FormData,
): Promise<ExpenseDraftActionState> {
  const parsedInput = inputSchema.safeParse({
    text: formData.get("text") ?? "",
  });

  if (!parsedInput.success) {
    return {
      success: false,
      message: "Veuillez corriger le champ.",
      errors: fieldErrors(parsedInput.error),
    };
  }

  const userId = await getUserId();

  if (!checkRateLimit(`ai-expense:${userId}`, { limit: 10, windowMs: 60_000 })) {
    return {
      success: false,
      message: "Trop de requêtes. Réessayez dans une minute.",
    };
  }

  const now = new Date();

  try {
    const { output } = await generateText({
      model: getExpenseModel(),
      output: Output.object({
        schema: aiExpenseDraftSchema,
        name: "ExpenseDraft",
      }),
      instructions: buildExpenseInstructions(now),
      prompt: parsedInput.data.text,
      abortSignal: AbortSignal.timeout(15_000),
    });

    const result = toExpenseDraft(output, now);

    if (!result.ok) {
      return {
        success: false,
        message: REJECTION_MESSAGES[result.reason],
        errors: { amount: ["Montant manquant ou invalide."] },
      };
    }

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
    };
  } catch (error: unknown) {
    if (NoObjectGeneratedError.isInstance(error)) {
      return {
        success: false,
        message: "Extraction impossible. Reformulez ou remplissez le formulaire.",
      };
    }

    if (APICallError.isInstance(error)) {
      console.error("parseExpenseText APICallError:", error.statusCode);

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
      "parseExpenseText failed:",
      error instanceof Error ? error.name : error,
    );

    return {
      success: false,
      message:
        "Le service IA est indisponible. Remplissez le formulaire ci-dessous.",
    };
  }
}
