import { z } from "zod";
import { BUDGET_CATEGORIES, type BudgetCategory } from "@/lib/constants/budget";
import {
  millimesToTnd,
  tndToMillimes,
  tunisDayIso,
} from "@/lib/budget/calculations";

export const aiExpenseDraftSchema = z.object({
  amountTnd: z
    .number()
    .nullable()
    .describe(
      "Montant en dinars tunisiens (TND), décimal avec point, ex. 85 ou 85.5. " +
        "3 décimales = millimes (85.500 signifie 85,5 TND). " +
        "null si AUCUN montant n'est mentionné — n'invente jamais un montant.",
    ),
  dateIso: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD attendu")
    .nullable()
    .describe(
      "Date de la dépense au format YYYY-MM-DD. Deux sources autorisées : " +
        "(1) une entrée du calendrier fourni dans les instructions (aujourd'hui, demain, J-1 à J-7) ; " +
        "(2) une date explicite écrite dans la phrase (« le 15 octobre » → année en cours, " +
        "« 15/10/2027 » → 2027-10-15). Les dates futures sont autorisées (dépense planifiée). " +
        "null si aucune date déductible.",
    ),
  category: z
    .enum(BUDGET_CATEGORIES)
    .describe(
      "LOYER=loyer | CHARGES=charges de copropriété/syndic | " +
        "ENERGIE=électricité (STEG), eau (SONEDE), gaz | INTERNET=internet/téléphone " +
        "| REPARATIONS=réparations, plomberie, artisan | ASSURANCE=assurance | " +
        "DIVERS=tout le reste ou catégorie peu claire",
    ),
  note: z
    .string()
    .max(200)
    .nullable()
    .describe(
      "Note courte (max 200 caractères) résumant la dépense, ex. « Facture STEG ». " +
        "null si la phrase n'apporte rien de plus que la catégorie. " +
        "Ne recopie jamais d'informations personnelles (nom, téléphone, email, adresse).",
    ),
  missingFields: z
    .array(z.enum(["amountTnd", "dateIso", "category"]))
    .describe(
      "Champs que tu n'as PAS pu déduire de la phrase (liste vide si tout est clair).",
    ),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe("Confiance globale dans l'extraction."),
  multipleExpenses: z
    .boolean()
    .describe("true si la phrase décrit PLUSIEURS dépenses distinctes."),
});

export type AiExpenseDraft = z.infer<typeof aiExpenseDraftSchema>;

export type UncertainField = "amount" | "date" | "category" | "note";

export type ExpenseDraftResult = {
  amount: string;
  date: string;
  category: BudgetCategory;
  note: string;
  uncertainFields: UncertainField[];
  multipleExpenses: boolean;
};

export type ExpenseDraftOutcome =
  | { ok: false; reason: "not_an_expense" | "amount_missing" | "amount_invalid" }
  | { ok: true; draft: ExpenseDraftResult };

const MISSING_TO_UI = {
  amountTnd: "amount",
  dateIso: "date",
  category: "category",
} as const;

export function toExpenseDraft(
  output: AiExpenseDraft,
  now: Date = new Date(),
): ExpenseDraftOutcome {
  const todayIso = tunisDayIso(now);

  if (output.amountTnd === null) {
    const allMissing =
      output.missingFields.includes("dateIso") &&
      output.missingFields.includes("category");

    return { ok: false, reason: allMissing ? "not_an_expense" : "amount_missing" };
  }

  const millimes = tndToMillimes(output.amountTnd);

  if (!Number.isInteger(millimes) || millimes <= 0) {
    return { ok: false, reason: "amount_invalid" };
  }

  const uncertain = new Set<UncertainField>(
    output.missingFields.map((field) => MISSING_TO_UI[field]),
  );
  let dateIso = output.dateIso ?? todayIso;

  if (Number.isNaN(new Date(`${dateIso}T00:00:00.000Z`).getTime())) {
    dateIso = todayIso;
    uncertain.add("date");
  }

  if (dateIso > todayIso) {
    uncertain.add("date");
  }

  return {
    ok: true,
    draft: {
      amount: millimesToTnd(millimes),
      date: dateIso,
      category: output.category,
      note: output.note ?? "",
      uncertainFields: [...uncertain],
      multipleExpenses: output.multipleExpenses,
    },
  };
}
