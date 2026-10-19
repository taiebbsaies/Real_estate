export const BUDGET_CATEGORIES = [
  "LOYER",
  "CHARGES",
  "ENERGIE",
  "INTERNET",
  "REPARATIONS",
  "ASSURANCE",
  "DIVERS",
] as const;

export type BudgetCategory = (typeof BUDGET_CATEGORIES)[number];

export const BUDGET_CATEGORY_LABELS: Record<BudgetCategory, string> = {
  LOYER: "Loyer",
  CHARGES: "Charges",
  ENERGIE: "Électricité/Eau/Gaz",
  INTERNET: "Internet",
  REPARATIONS: "Réparations",
  ASSURANCE: "Assurance",
  DIVERS: "Divers",
};
