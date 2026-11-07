import { z } from "zod";
import type { MonthlySummaryData } from "@/lib/budget/insights";
import type { CategoryProjection } from "@/lib/budget/projections";
import {
  BUDGET_CATEGORIES,
  type BudgetCategory,
} from "@/lib/constants/budget";

export const MONTHLY_SUMMARY_MAX_LENGTH = 600;

export const aiMonthlySummarySchema = z.object({
  summary: z
    .string()
    .min(1, "Le résumé est vide.")
    .max(MONTHLY_SUMMARY_MAX_LENGTH, "Le résumé est trop long.")
    .describe(
      "Résumé mensuel en français, vouvoiement, 4 à 6 lignes, maximum 500 caractères, " +
        "sans markdown ni emoji. Chaque montant provient du JSON fourni et est suivi de « TND ».",
    ),
});

export type AiMonthlySummary = z.infer<typeof aiMonthlySummarySchema>;

export type MonthlySummaryValidation =
  | { ok: true; text: string }
  | { ok: false; reason: "empty" | "too_long" | "unknown_amount" };

const TND_AMOUNT_PATTERN = /(\d{1,3}(?:[ \u00A0\u202F]\d{3})*(?:,\d+)?)\s*TND/gi;

function normalizeAmount(value: string): string {
  return value.replace(/[\u00A0\u202F]/g, " ");
}

function stripSign(value: string): string {
  return value.replace(/^[+-]/, "");
}

export function collectAllowedAmounts(data: MonthlySummaryData): Set<string> {
  const amounts = new Set<string>();

  const add = (value: string | null | undefined): void => {
    if (value !== null && value !== undefined && value !== "") {
      amounts.add(normalizeAmount(stripSign(value)));
    }
  };

  add(data.budget.limitTnd);
  add(data.budget.incomeTnd);
  add(data.budget.spentTnd);
  add(data.budget.remainingTnd);
  add(data.budget.forecastTnd);
  add(data.budget.overshootTnd);

  for (const category of data.categories) {
    add(category.spentTnd);
    add(category.prevSpentTnd);
    add(category.deltaTnd);
  }

  for (const expense of data.topExpenses) {
    add(expense.amountTnd);
  }

  return amounts;
}

export function extractTndAmounts(text: string): string[] {
  return [...text.matchAll(TND_AMOUNT_PATTERN)].map((match) =>
    normalizeAmount(match[1]),
  );
}

export function validateMonthlySummaryOutput(
  rawText: string,
  data: MonthlySummaryData,
): MonthlySummaryValidation {
  const text = rawText.trim();

  if (text.length === 0) {
    return { ok: false, reason: "empty" };
  }

  if (text.length > MONTHLY_SUMMARY_MAX_LENGTH) {
    return { ok: false, reason: "too_long" };
  }

  const allowed = collectAllowedAmounts(data);

  for (const amount of extractTndAmounts(text)) {
    if (!allowed.has(amount)) {
      return { ok: false, reason: "unknown_amount" };
    }
  }

  return { ok: true, text };
}

export const PREDICTIVE_ALERT_MAX_LENGTH = 300;

export const aiPredictiveAlertsSchema = z.object({
  alerts: z
    .array(
      z.object({
        key: z.enum(BUDGET_CATEGORIES).describe("Key de l'alerte, reprise telle quelle du JSON."),
        text: z
          .string()
          .min(1)
          .max(PREDICTIVE_ALERT_MAX_LENGTH)
          .describe(
            "Message d'alerte d'une à deux phrases en français (vouvoiement), " +
              "sans markdown ni emoji, reprenant uniquement les chiffres fournis suivis de « TND ».",
          ),
      }),
    )
    .min(1),
});

export type AiPredictiveAlerts = z.infer<typeof aiPredictiveAlertsSchema>;

export type PredictiveAlertsValidation =
  | { ok: true; texts: Partial<Record<BudgetCategory, string>> }
  | {
      ok: false;
      reason:
        | "missing_keys"
        | "unknown_key"
        | "empty_text"
        | "too_long"
        | "unknown_amount";
    };

export function validatePredictiveAlertsOutput(
  alerts: AiPredictiveAlerts["alerts"],
  projections: CategoryProjection[],
): PredictiveAlertsValidation {
  const expected = new Map(projections.map((item) => [item.key, item]));
  const seen = new Set<BudgetCategory>();
  const texts: Partial<Record<BudgetCategory, string>> = {};

  for (const alert of alerts) {
    const projection = expected.get(alert.key);

    if (!projection || seen.has(alert.key)) {
      return { ok: false, reason: "unknown_key" };
    }

    const text = alert.text.trim();

    if (text.length === 0) {
      return { ok: false, reason: "empty_text" };
    }

    if (text.length > PREDICTIVE_ALERT_MAX_LENGTH) {
      return { ok: false, reason: "too_long" };
    }

    const allowed = new Set(
      [
        projection.limitTnd,
        projection.spentTnd,
        projection.projectionTnd,
        projection.overshootTnd,
      ].map((value) => normalizeAmount(stripSign(value))),
    );

    for (const amount of extractTndAmounts(text)) {
      if (!allowed.has(amount)) {
        return { ok: false, reason: "unknown_amount" };
      }
    }

    seen.add(alert.key);
    texts[alert.key] = text;
  }

  for (const projection of projections) {
    if (!seen.has(projection.key)) {
      return { ok: false, reason: "missing_keys" };
    }
  }

  return { ok: true, texts };
}
