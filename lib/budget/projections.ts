import {
  BUDGET_CATEGORY_LABELS,
  type BudgetCategory,
} from "@/lib/constants/budget";
import { millimesToTnd } from "@/lib/budget/calculations";
import { formatSignedTnd } from "@/lib/budget/insights";
import type { SerializedExpense } from "@/lib/budget/queries";

export const FIXED_CATEGORIES = ["LOYER"] as const;
export const OVERSHOOT_MIN_MILLIMES = 5_000;
export const OVERSHOOT_LIMIT_SHARE = 0.05;
export const MIN_DAY_OF_MONTH = 3;
export const MIN_EXPENSE_COUNT = 2;
export const MIN_SPENT_LIMIT_SHARE = 0.2;

export type CategoryProjectionLevel = "risk" | "exceeded";

export type CategoryProjection = {
  key: BudgetCategory;
  label: string;
  level: CategoryProjectionLevel;
  limit: number;
  spent: number;
  projection: number;
  overshoot: number;
  limitTnd: string;
  spentTnd: string;
  projectionTnd: string;
  overshootTnd: string;
  crossingDay: number | null;
};

export type CategoryProjectionsArgs = {
  totalsByCategory: Record<string, number>;
  expenses: SerializedExpense[];
  categoryLimits: Partial<Record<BudgetCategory, number>>;
  dayOfMonth: number;
  daysOfTheMonth: number;
};

export type CategoryProjections = {
  dayOfMonth: number;
  daysOfTheMonth: number;
  alerts: CategoryProjection[];
};

export type StoredInsightAlert = {
  categoryKey: string;
  level: CategoryProjectionLevel;
  crossingDay?: number;
  text: string;
};

export type PredictiveAlertView = {
  key: BudgetCategory;
  label: string;
  level: CategoryProjectionLevel;
  crossingDay: number | null;
  text: string;
};

export type PredictiveAlertsInsight = {
  alerts: PredictiveAlertView[];
  source: "ai" | "template";
  generatedAt: string;
};

export function toPredictiveAlertViews(
  alerts: StoredInsightAlert[],
): PredictiveAlertView[] {
  return alerts.map((alert) => ({
    key: alert.categoryKey as BudgetCategory,
    label:
      BUDGET_CATEGORY_LABELS[alert.categoryKey as BudgetCategory] ??
      alert.categoryKey,
    level: alert.level,
    crossingDay: alert.crossingDay ?? null,
    text: alert.text,
  }));
}

export function buildTemplateAlertText(alert: CategoryProjection): string {
  if (alert.level === "exceeded") {
    return `Budget ${alert.label} dépassé de ${alert.overshootTnd.replace("+", "")} TND.`;
  }

  return `À ce rythme, vous dépasserez votre budget ${alert.label} vers le ${alert.crossingDay} (≈ ${alert.overshootTnd.replace("+", "")} TND au-dessus du plafond).`;
}

export function buildCategoryProjections(
  args: CategoryProjectionsArgs,
): CategoryProjections {
  const { totalsByCategory, expenses, categoryLimits } = args;
  const dayOfMonth = args.dayOfMonth;
  const daysOfTheMonth = args.daysOfTheMonth;

  const countsByCategory = new Map<BudgetCategory, number>();

  for (const expense of expenses) {
    countsByCategory.set(
      expense.category,
      (countsByCategory.get(expense.category) ?? 0) + 1,
    );
  }

  const alerts: CategoryProjection[] = [];

  for (const category of Object.keys(categoryLimits) as BudgetCategory[]) {
    const limit = categoryLimits[category];

    if (limit === undefined || limit <= 0) {
      continue;
    }

    const spent = totalsByCategory[category] ?? 0;

    if (spent >= limit) {
      alerts.push({
        key: category,
        label: BUDGET_CATEGORY_LABELS[category] ?? category,
        level: "exceeded",
        limit,
        spent,
        projection: spent,
        overshoot: spent - limit,
        limitTnd: millimesToTnd(limit),
        spentTnd: millimesToTnd(spent),
        projectionTnd: millimesToTnd(spent),
        overshootTnd: formatSignedTnd(spent - limit),
        crossingDay: null,
      });

      continue;
    }

    if (
      dayOfMonth < MIN_DAY_OF_MONTH ||
      (FIXED_CATEGORIES as readonly string[]).includes(category)
    ) {
      continue;
    }

    const dailyAverage = spent / dayOfMonth;
    const daysLeft = Math.max(0, daysOfTheMonth - dayOfMonth);

    if (dailyAverage <= 0 || daysLeft <= 0) {
      continue;
    }

    const projection = Math.round(spent + dailyAverage * daysLeft);
    const margin = Math.max(
      OVERSHOOT_MIN_MILLIMES,
      Math.round(limit * OVERSHOOT_LIMIT_SHARE),
    );

    if (projection <= limit + margin) {
      continue;
    }

    const expenseCount = countsByCategory.get(category) ?? 0;
    const enoughData =
      expenseCount >= MIN_EXPENSE_COUNT ||
      spent >= limit * MIN_SPENT_LIMIT_SHARE;

    if (!enoughData) {
      continue;
    }

    const crossingDay = Math.min(
      daysOfTheMonth,
      Math.max(dayOfMonth + 1, Math.ceil(limit / dailyAverage)),
    );

    alerts.push({
      key: category,
      label: BUDGET_CATEGORY_LABELS[category] ?? category,
      level: "risk",
      limit,
      spent,
      projection,
      overshoot: projection - limit,
      limitTnd: millimesToTnd(limit),
      spentTnd: millimesToTnd(spent),
      projectionTnd: millimesToTnd(projection),
      overshootTnd: formatSignedTnd(projection - limit),
      crossingDay,
    });
  }

  alerts.sort((a, b) => {
    const ratioA = a.projection / a.limit;
    const ratioB = b.projection / b.limit;

    if (ratioA !== ratioB) {
      return ratioB - ratioA;
    }

    return a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
  });

  return { dayOfMonth, daysOfTheMonth, alerts };
}
