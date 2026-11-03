import type { BudgetCategory } from "@/lib/constants/budget";

export type DraftPayload = {
  amount: string;
  date: string;
  category: BudgetCategory;
  note: string;
  uncertainFields: string[];
  multipleExpenses: boolean;
};

export type AnalysisResponseLike = {
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
} | null;

export type AnalysisOutcome =
  | { kind: "stale" }
  | { kind: "error"; message: string }
  | { kind: "apply"; draft: DraftPayload }
  | { kind: "hold"; draft: DraftPayload };

export function resolveAnalysis(input: {
  seq: number;
  latestSeq: number;
  formDirty: boolean;
  response: AnalysisResponseLike;
  thrownMessage: string;
}): AnalysisOutcome {
  if (input.seq !== input.latestSeq) {
    return { kind: "stale" };
  }

  const response = input.response;

  if (!response) {
    return { kind: "error", message: input.thrownMessage };
  }

  if (!response.success || !response.draft) {
    return { kind: "error", message: response.message || input.thrownMessage };
  }

  const draft: DraftPayload = {
    amount: response.draft.amount,
    date: response.draft.date,
    category: response.draft.category,
    note: response.draft.note,
    uncertainFields: response.uncertainFields ?? [],
    multipleExpenses: response.multipleExpenses ?? false,
  };

  return input.formDirty ? { kind: "hold", draft } : { kind: "apply", draft };
}
