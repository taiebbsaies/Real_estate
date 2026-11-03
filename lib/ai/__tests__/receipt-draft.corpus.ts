import type { BudgetCategory } from "@/lib/constants/budget";
import type { AiReceiptDraft } from "@/lib/ai/expense-draft";

export type ReceiptCorpusExpectation =
  | { ok: false; reason: "not_an_expense" | "amount_missing" | "amount_invalid" }
  | {
      ok: true;
      amount: string;
      date: string;
      category: BudgetCategory;
      note: string;
      uncertainFields: string[];
      multipleExpenses: boolean;
    };

export type ReceiptCorpusCase = {
  document: string;
  llmOutput: AiReceiptDraft;
  expected: ReceiptCorpusExpectation;
};

function receipt(
  overrides: Partial<AiReceiptDraft>,
): AiReceiptDraft {
  return {
    amountTnd: null,
    dateIso: null,
    category: "DIVERS",
    note: null,
    missingFields: [],
    confidence: "high",
    multipleExpenses: false,
    merchant: null,
    amountBasis: "TTC",
    ...overrides,
  };
}

export const RECEIPT_CORPUS: ReceiptCorpusCase[] = [
  {
    document: "facture STEG FR nette, total TTC 85.500 DT, 28/10/2026",
    llmOutput: receipt({
      amountTnd: 85.5,
      dateIso: "2026-10-28",
      category: "ENERGIE",
      note: "Facture STEG",
      merchant: "STEG",
    }),
    expected: {
      ok: true,
      amount: "85,500",
      date: "2026-10-28",
      category: "ENERGIE",
      note: "Facture STEG",
      uncertainFields: [],
      multipleExpenses: false,
    },
  },
  {
    document: "facture SONEDE, note absente",
    llmOutput: receipt({
      amountTnd: 42.25,
      dateIso: "2026-10-20",
      category: "ENERGIE",
      merchant: "SONEDE",
    }),
    expected: {
      ok: true,
      amount: "42,250",
      date: "2026-10-20",
      category: "ENERGIE",
      note: "SONEDE",
      uncertainFields: [],
      multipleExpenses: false,
    },
  },
  {
    document: "reçu Ooredoo, note absente",
    llmOutput: receipt({
      amountTnd: 39.9,
      dateIso: "2026-11-01",
      category: "INTERNET",
      merchant: "Ooredoo",
    }),
    expected: {
      ok: true,
      amount: "39,900",
      date: "2026-11-01",
      category: "INTERNET",
      note: "Ooredoo",
      uncertainFields: [],
      multipleExpenses: false,
    },
  },
  {
    document: "facture Orange, date illisible",
    llmOutput: receipt({
      amountTnd: 25,
      category: "INTERNET",
      missingFields: ["dateIso"],
      merchant: "Orange",
      confidence: "medium",
    }),
    expected: {
      ok: true,
      amount: "25,000",
      date: "2026-11-01",
      category: "INTERNET",
      note: "Orange",
      uncertainFields: ["date"],
      multipleExpenses: false,
    },
  },
  {
    document: "facture Tunisie Telecom avec TTC et HT imprimés",
    llmOutput: receipt({
      amountTnd: 59.76,
      dateIso: "2026-10-25",
      category: "INTERNET",
      merchant: "Tunisie Telecom",
    }),
    expected: {
      ok: true,
      amount: "59,760",
      date: "2026-10-25",
      category: "INTERNET",
      note: "Tunisie Telecom",
      uncertainFields: [],
      multipleExpenses: false,
    },
  },
  {
    document: "reçu Topnet",
    llmOutput: receipt({
      amountTnd: 45,
      dateIso: "2026-10-31",
      category: "INTERNET",
      merchant: "Topnet",
    }),
    expected: {
      ok: true,
      amount: "45,000",
      date: "2026-10-31",
      category: "INTERNET",
      note: "Topnet",
      uncertainFields: [],
      multipleExpenses: false,
    },
  },
  {
    document: "ticket Monoprix multi-articles, total 62.300 DT",
    llmOutput: receipt({
      amountTnd: 62.3,
      dateIso: "2026-10-30",
      category: "DIVERS",
      merchant: "Monoprix",
    }),
    expected: {
      ok: true,
      amount: "62,300",
      date: "2026-10-30",
      category: "DIVERS",
      note: "Monoprix",
      uncertainFields: [],
      multipleExpenses: false,
    },
  },
  {
    document: "quittance loyer + charges, première ligne = loyer 800 DT",
    llmOutput: receipt({
      amountTnd: 800,
      dateIso: "2026-10-31",
      category: "LOYER",
      note: "Loyer octobre",
      multipleExpenses: true,
      merchant: "Syndic Les Jasmins",
    }),
    expected: {
      ok: true,
      amount: "800,000",
      date: "2026-10-31",
      category: "LOYER",
      note: "Loyer octobre",
      uncertainFields: [],
      multipleExpenses: true,
    },
  },
  {
    document: "reçu STEG avec bruit OCR « 8S,5OO DT »",
    llmOutput: receipt({
      amountTnd: 85.5,
      dateIso: "2026-10-28",
      category: "ENERGIE",
      merchant: "STEG",
      confidence: "medium",
    }),
    expected: {
      ok: true,
      amount: "85,500",
      date: "2026-10-28",
      category: "ENERGIE",
      note: "STEG",
      uncertainFields: [],
      multipleExpenses: false,
    },
  },
  {
    document: "devis plombier avec total HT uniquement",
    llmOutput: receipt({
      amountTnd: 100,
      dateIso: "2026-10-29",
      category: "REPARATIONS",
      merchant: "Plomberie Karim",
      amountBasis: "HT",
    }),
    expected: {
      ok: true,
      amount: "100,000",
      date: "2026-10-29",
      category: "REPARATIONS",
      note: "Plomberie Karim",
      uncertainFields: ["amount"],
      multipleExpenses: false,
    },
  },
  {
    document: "ticket avec seul sous-total lisible",
    llmOutput: receipt({
      amountTnd: 32.5,
      dateIso: "2026-10-27",
      category: "DIVERS",
      amountBasis: "SUBTOTAL",
    }),
    expected: {
      ok: true,
      amount: "32,500",
      date: "2026-10-27",
      category: "DIVERS",
      note: "",
      uncertainFields: ["amount"],
      multipleExpenses: false,
    },
  },
  {
    document: "facture avec totaux contradictoires (TTC/HT confondus)",
    llmOutput: receipt({
      amountTnd: 74.9,
      dateIso: "2026-10-26",
      category: "DIVERS",
      amountBasis: "UNKNOWN",
      confidence: "low",
    }),
    expected: {
      ok: true,
      amount: "74,900",
      date: "2026-10-26",
      category: "DIVERS",
      note: "",
      uncertainFields: [],
      multipleExpenses: false,
    },
  },
  {
    document: "reçu café, date absente",
    llmOutput: receipt({
      amountTnd: 12,
      category: "DIVERS",
      missingFields: ["dateIso"],
      merchant: "Café de la Paix",
    }),
    expected: {
      ok: true,
      amount: "12,000",
      date: "2026-11-01",
      category: "DIVERS",
      note: "Café de la Paix",
      uncertainFields: ["date"],
      multipleExpenses: false,
    },
  },
  {
    document: "facture en euros, non convertie",
    llmOutput: receipt({
      amountTnd: 50,
      dateIso: "2026-10-24",
      category: "DIVERS",
      note: "Achat en ligne (EUR)",
      confidence: "low",
    }),
    expected: {
      ok: true,
      amount: "50,000",
      date: "2026-10-24",
      category: "DIVERS",
      note: "Achat en ligne (EUR)",
      uncertainFields: [],
      multipleExpenses: false,
    },
  },
  {
    document: "فاتورة كهرباء STEG بالعربية",
    llmOutput: receipt({
      amountTnd: 120,
      dateIso: "2026-10-15",
      category: "ENERGIE",
      merchant: "STEG",
    }),
    expected: {
      ok: true,
      amount: "120,000",
      date: "2026-10-15",
      category: "ENERGIE",
      note: "STEG",
      uncertainFields: [],
      multipleExpenses: false,
    },
  },
  {
    document: "فاتورة إنترنات أوريدو بالعربية",
    llmOutput: receipt({
      amountTnd: 35,
      dateIso: "2026-11-01",
      category: "INTERNET",
      merchant: "Ooredoo",
    }),
    expected: {
      ok: true,
      amount: "35,000",
      date: "2026-11-01",
      category: "INTERNET",
      note: "Ooredoo",
      uncertainFields: [],
      multipleExpenses: false,
    },
  },
  {
    document: "capture d'écran d'un virement de loyer",
    llmOutput: receipt({
      amountTnd: 950,
      dateIso: "2026-10-30",
      category: "LOYER",
      note: "Virement loyer",
    }),
    expected: {
      ok: true,
      amount: "950,000",
      date: "2026-10-30",
      category: "LOYER",
      note: "Virement loyer",
      uncertainFields: [],
      multipleExpenses: false,
    },
  },
  {
    document: "photo floue sans rien de lisible",
    llmOutput: receipt({
      missingFields: ["amountTnd", "dateIso", "category"],
      confidence: "low",
    }),
    expected: { ok: false, reason: "not_an_expense" },
  },
  {
    document: "reçu lisible mais montant illisible",
    llmOutput: receipt({
      dateIso: "2026-10-22",
      category: "ENERGIE",
      missingFields: ["amountTnd"],
      merchant: "STEG",
      confidence: "low",
    }),
    expected: { ok: false, reason: "amount_missing" },
  },
  {
    document: "facture avec date future manifestement erronée",
    llmOutput: receipt({
      amountTnd: 65,
      dateIso: "2027-01-15",
      category: "CHARGES",
      merchant: "Syndic",
    }),
    expected: {
      ok: true,
      amount: "65,000",
      date: "2027-01-15",
      category: "CHARGES",
      note: "Syndic",
      uncertainFields: ["date"],
      multipleExpenses: false,
    },
  },
];
