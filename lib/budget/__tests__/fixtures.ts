import type {
  MonthSummary,
  SerializedExpense,
} from "@/lib/budget/queries";

export const MONTH = "2026-11";
export const NOW = new Date("2026-11-15T10:00:00.000Z");

export function monthSummary(
  overrides: Partial<MonthSummary> = {},
): MonthSummary {
  return {
    budget: null,
    spent: 0,
    totalsByCategory: {},
    sharesByCategory: {},
    remaining: 0,
    percentUsed: 0,
    alertLevel: "normal",
    ...overrides,
  };
}

export function expense(
  overrides: Partial<SerializedExpense>,
): SerializedExpense {
  return {
    id: "e1",
    amount: 1_000,
    date: "2026-11-05T00:00:00.000Z",
    category: "DIVERS",
    createdAt: "2026-11-05T18:00:00.000Z",
    updatedAt: "2026-11-05T18:00:00.000Z",
    ...overrides,
  };
}

export const CURRENT = monthSummary({
  budget: {
    id: "b1",
    month: "2026-11",
    limit: 150_000,
    income: 200_000,
    createdAt: "2026-11-01T07:00:00.000Z",
    updatedAt: "2026-11-01T07:00:00.000Z",
  },
  spent: 100_000,
  totalsByCategory: {
    ENERGIE: 40_000,
    LOYER: 30_000,
    DIVERS: 20_000,
    INTERNET: 10_000,
  },
  sharesByCategory: { ENERGIE: 40, LOYER: 30, DIVERS: 20, INTERNET: 10 },
  remaining: 50_000,
  percentUsed: 66.7,
  alertLevel: "normal",
});

export const PREVIOUS = monthSummary({
  budget: {
    id: "b0",
    month: "2026-10",
    limit: 140_000,
    createdAt: "2026-10-01T07:00:00.000Z",
    updatedAt: "2026-10-01T07:00:00.000Z",
  },
  spent: 75_000,
  totalsByCategory: { ENERGIE: 20_000, LOYER: 30_000, INTERNET: 25_000 },
  sharesByCategory: { ENERGIE: 26.7, LOYER: 40, INTERNET: 33.3 },
  remaining: 65_000,
  percentUsed: 53.6,
  alertLevel: "normal",
});

export const EXPENSES = [
  expense({
    id: "e1",
    amount: 40_000,
    date: "2026-11-05T00:00:00.000Z",
    category: "ENERGIE",
    note: "Facture STEG",
    updatedAt: "2026-11-05T18:00:00.000Z",
  }),
  expense({
    id: "e2",
    amount: 30_000,
    date: "2026-11-01T00:00:00.000Z",
    category: "LOYER",
    updatedAt: "2026-11-01T08:00:00.000Z",
  }),
  expense({
    id: "e3",
    amount: 12_000,
    date: "2026-11-08T00:00:00.000Z",
    category: "DIVERS",
    updatedAt: "2026-11-09T10:00:00.000Z",
  }),
  expense({
    id: "e4",
    amount: 8_000,
    date: "2026-11-12T00:00:00.000Z",
    category: "DIVERS",
    updatedAt: "2026-11-12T09:00:00.000Z",
  }),
  expense({
    id: "e5",
    amount: 10_000,
    date: "2026-11-10T00:00:00.000Z",
    category: "INTERNET",
    updatedAt: "2026-11-10T20:00:00.000Z",
  }),
];
