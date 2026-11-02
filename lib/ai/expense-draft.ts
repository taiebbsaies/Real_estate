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

export const aiReceiptDraftSchema = aiExpenseDraftSchema.extend({
  merchant: z
    .string()
    .max(80)
    .nullable()
    .describe(
      "Nom du fournisseur ou du commerçant tel qu'imprimé sur le justificatif " +
        "(ex. « STEG », « Ooredoo », « Monoprix »). null si illisible ou absent. " +
        "Ne recopie jamais le nom du client, un téléphone, un email ou une adresse.",
    ),
  amountBasis: z
    .enum(["TTC", "HT", "SUBTOTAL", "UNKNOWN"])
    .describe(
      "Nature du montant retenu : TTC = total à payer (prioritaire), " +
        "HT = total hors taxes, SUBTOTAL = sous-total intermédiaire, " +
        "UNKNOWN = nature indéterminable.",
    ),
});

export type AiReceiptDraft = z.infer<typeof aiReceiptDraftSchema>;

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

function isRealCalendarDate(iso: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);

  if (!match) {
    return false;
  }

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

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

  if (!isRealCalendarDate(dateIso)) {
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

export function toReceiptDraft(
  output: AiReceiptDraft,
  now: Date = new Date(),
): ExpenseDraftOutcome {
  const result = toExpenseDraft(output, now);

  if (!result.ok) {
    return result;
  }

  const note = result.draft.note || output.merchant || "";
  const uncertainFields = [...result.draft.uncertainFields];

  if (
    (output.amountBasis === "HT" || output.amountBasis === "SUBTOTAL") &&
    !uncertainFields.includes("amount")
  ) {
    uncertainFields.push("amount");
  }

  return {
    ok: true,
    draft: { ...result.draft, note, uncertainFields },
  };
}
