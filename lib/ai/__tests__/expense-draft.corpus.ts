import type { BudgetCategory } from "@/lib/constants/budget";
import type { AiExpenseDraft } from "@/lib/ai/expense-draft";

export const FIXED_NOW = new Date("2026-11-01T12:00:00.000Z");

export type CorpusExpectation =
  | { ok: false; reason: "not_an_expense" | "amount_missing" | "amount_invalid" }
  | {
      ok: true;
      amount: string;
      date: string;
      category: BudgetCategory;
      uncertainFields: string[];
      multipleExpenses: boolean;
    };

export type CorpusCase = {
  phrase: string;
  llmOutput: AiExpenseDraft;
  expected: CorpusExpectation;
};

function draft(overrides: Partial<AiExpenseDraft>): AiExpenseDraft {
  return {
    amountTnd: null,
    dateIso: null,
    category: "DIVERS",
    note: null,
    missingFields: [],
    confidence: "high",
    multipleExpenses: false,
    ...overrides,
  };
}

export const CORPUS: CorpusCase[] = [
  {
    phrase: "j'ai payé 85 dinars d'électricité hier",
    llmOutput: draft({ amountTnd: 85, dateIso: "2026-10-31", category: "ENERGIE", note: "Électricité" }),
    expected: { ok: true, amount: "85,000", date: "2026-10-31", category: "ENERGIE", uncertainFields: [], multipleExpenses: false },
  },
  {
    phrase: "85,5 DT internet",
    llmOutput: draft({ amountTnd: 85.5, dateIso: "2026-11-01", category: "INTERNET" }),
    expected: { ok: true, amount: "85,500", date: "2026-11-01", category: "INTERNET", uncertainFields: [], multipleExpenses: false },
  },
  {
    phrase: "loyer 1200 dinars",
    llmOutput: draft({ amountTnd: 1200, dateIso: "2026-11-01", category: "LOYER" }),
    expected: { ok: true, amount: "1\u202F200,000", date: "2026-11-01", category: "LOYER", uncertainFields: [], multipleExpenses: false },
  },
  {
    phrase: "réglé la STEG 95.500",
    llmOutput: draft({ amountTnd: 95.5, dateIso: "2026-11-01", category: "ENERGIE", note: "Facture STEG" }),
    expected: { ok: true, amount: "95,500", date: "2026-11-01", category: "ENERGIE", uncertainFields: [], multipleExpenses: false },
  },
  {
    phrase: "café 12 dinars avant-hier",
    llmOutput: draft({ amountTnd: 12, dateIso: "2026-10-30", category: "DIVERS", note: "Café", confidence: "medium" }),
    expected: { ok: true, amount: "12,000", date: "2026-10-30", category: "DIVERS", uncertainFields: [], multipleExpenses: false },
  },
  {
    phrase: "خلّيت 45 دينار على الماء",
    llmOutput: draft({ amountTnd: 45, dateIso: "2026-11-01", category: "ENERGIE" }),
    expected: { ok: true, amount: "45,000", date: "2026-11-01", category: "ENERGIE", uncertainFields: [], multipleExpenses: false },
  },
  {
    phrase: "internet 59 dt lundi dernier",
    llmOutput: draft({ amountTnd: 59, dateIso: "2026-10-26", category: "INTERNET" }),
    expected: { ok: true, amount: "59,000", date: "2026-10-26", category: "INTERNET", uncertainFields: [], multipleExpenses: false },
  },
  {
    phrase: "réparation plomberie 180",
    llmOutput: draft({ amountTnd: 180, dateIso: "2026-11-01", category: "REPARATIONS", note: "Plomberie" }),
    expected: { ok: true, amount: "180,000", date: "2026-11-01", category: "REPARATIONS", uncertainFields: [], multipleExpenses: false },
  },
  {
    phrase: "assurance habitation 320 dinars",
    llmOutput: draft({ amountTnd: 320, dateIso: "2026-11-01", category: "ASSURANCE" }),
    expected: { ok: true, amount: "320,000", date: "2026-11-01", category: "ASSURANCE", uncertainFields: [], multipleExpenses: false },
  },
  {
    phrase: "charges syndic 75",
    llmOutput: draft({ amountTnd: 75, dateIso: "2026-11-01", category: "CHARGES" }),
    expected: { ok: true, amount: "75,000", date: "2026-11-01", category: "CHARGES", uncertainFields: [], multipleExpenses: false },
  },
  {
    phrase: "j'ai dépensé de l'argent",
    llmOutput: draft({ missingFields: ["amountTnd"], confidence: "low" }),
    expected: { ok: false, reason: "amount_missing" },
  },
  {
    phrase: "quel temps fera-t-il demain ?",
    llmOutput: draft({ missingFields: ["amountTnd", "dateIso", "category"], confidence: "low" }),
    expected: { ok: false, reason: "not_an_expense" },
  },
  {
    phrase: "50 dinars d'électricité et 30 d'internet",
    llmOutput: draft({ amountTnd: 50, dateIso: "2026-11-01", category: "ENERGIE", multipleExpenses: true }),
    expected: { ok: true, amount: "50,000", date: "2026-11-01", category: "ENERGIE", uncertainFields: [], multipleExpenses: true },
  },
  {
    phrase: "hier j'ai réglé la facture",
    llmOutput: draft({ dateIso: "2026-10-31", category: "ENERGIE", missingFields: ["amountTnd"], confidence: "medium" }),
    expected: { ok: false, reason: "amount_missing" },
  },
  {
    phrase: "−20 dinars",
    llmOutput: draft({ amountTnd: -20, confidence: "low" }),
    expected: { ok: false, reason: "amount_invalid" },
  },
  {
    phrase: "1 200 dinars de loyer",
    llmOutput: draft({ amountTnd: 1200, dateIso: "2026-11-01", category: "LOYER" }),
    expected: { ok: true, amount: "1\u202F200,000", date: "2026-11-01", category: "LOYER", uncertainFields: [], multipleExpenses: false },
  },
  {
    phrase: "85",
    llmOutput: draft({ amountTnd: 85, dateIso: "2026-11-01", missingFields: ["category"], confidence: "medium" }),
    expected: { ok: true, amount: "85,000", date: "2026-11-01", category: "DIVERS", uncertainFields: ["category"], multipleExpenses: false },
  },
  {
    phrase: "payé 100 dinars le 32/13/2026",
    llmOutput: draft({ amountTnd: 100, missingFields: ["dateIso"], confidence: "low" }),
    expected: { ok: true, amount: "100,000", date: "2026-11-01", category: "DIVERS", uncertainFields: ["date"], multipleExpenses: false },
  },
  {
    phrase: "100 euros d'électricité",
    llmOutput: draft({ amountTnd: 100, dateIso: "2026-11-01", category: "ENERGIE", missingFields: ["category"], confidence: "low" }),
    expected: { ok: true, amount: "100,000", date: "2026-11-01", category: "ENERGIE", uncertainFields: ["category"], multipleExpenses: false },
  },
  {
    phrase: "je paierai le loyer 800 demain",
    llmOutput: draft({ amountTnd: 800, dateIso: "2026-11-02", category: "LOYER" }),
    expected: { ok: true, amount: "800,000", date: "2026-11-02", category: "LOYER", uncertainFields: ["date"], multipleExpenses: false },
  },
  {
    phrase: "60 dinars de téléphone le 15 octobre",
    llmOutput: draft({ amountTnd: 60, dateIso: "2026-10-15", category: "INTERNET" }),
    expected: { ok: true, amount: "60,000", date: "2026-10-15", category: "INTERNET", uncertainFields: [], multipleExpenses: false },
  },
  {
    phrase: "25 dinars de gaz il y a 3 jours",
    llmOutput: draft({ amountTnd: 25, dateIso: "2026-10-29", category: "ENERGIE" }),
    expected: { ok: true, amount: "25,000", date: "2026-10-29", category: "ENERGIE", uncertainFields: [], multipleExpenses: false },
  },
];
