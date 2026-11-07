import {
  currentMonthTunis,
  dayOfMonthTunis,
  daysInMonth,
  forecastVariable,
  millimesToTnd,
  previousMonth,
  type AlertLevel,
} from "@/lib/budget/calculations";
import { formatMonthLabel, formatShortDayLabel } from "@/lib/budget/format";
import {
  BUDGET_CATEGORY_LABELS,
  type BudgetCategory,
} from "@/lib/constants/budget";
import type {
  MonthSummary,
  SerializedExpense,
} from "@/lib/budget/queries";

export const DELTA_MIN_MILLIMES = 2_000;
export const DELTA_TOTAL_SHARE = 0.1;

export type MonthlySummaryInsight = {
  text: string;
  source: "ai" | "template";
  generatedAt: string;
};

export type InsightFingerprintInput = {
  budgetUpdatedAt: string | null;
  expenseCount: number;
  spentTotal: number;
  maxExpenseUpdatedAt: string | null;
};

export function buildInsightFingerprint(input: InsightFingerprintInput): string {
  return [
    input.budgetUpdatedAt ?? "none",
    input.expenseCount,
    input.spentTotal,
    input.maxExpenseUpdatedAt ?? "none",
  ].join("|");
}

export type BuildMonthlySummaryDataArgs = {
  month: string;
  now: Date;
  current: MonthSummary;
  previous: MonthSummary;
  expenses: SerializedExpense[];
};

export type MonthlySummaryCategory = {
  key: BudgetCategory;
  label: string;
  spentTnd: string;
  share: number;
  prevSpentTnd: string;
  deltaTnd: string;
  deltaPercent: number | null;
};

export type MonthlySummaryTopExpense = {
  category: BudgetCategory;
  label: string;
  amountTnd: string;
  dateIso: string;
};

export type MonthlySummaryNotable = {
  key: BudgetCategory;
  label: string;
  deltaTnd: string;
};

export type MonthlySummaryNewCategory = {
  key: BudgetCategory;
  label: string;
  spentTnd: string;
};

export type MonthlySummaryData = {
  month: string;
  monthLabel: string;
  prevMonthLabel: string;
  dayOfMonth: number | null;
  daysInMonth: number;
  currency: "TND";
  budget: {
    limitTnd: string | null;
    incomeTnd: string | null;
    spentTnd: string;
    remainingTnd: string | null;
    percentUsed: number | null;
    alertLevel: AlertLevel | null;
    forecastTnd: string | null;
    overshootRisk: boolean | null;
    overshootTnd: string | null;
  };
  categories: MonthlySummaryCategory[];
  topExpenses: MonthlySummaryTopExpense[];
  notables: {
    hasComparison: boolean;
    biggestIncrease: MonthlySummaryNotable | null;
    biggestDecrease: MonthlySummaryNotable | null;
    newCategory: MonthlySummaryNewCategory | null;
  };
};

export function formatSignedTnd(millimes: number): string {
  const formatted = millimesToTnd(Math.abs(millimes));

  if (millimes > 0) {
    return `+${formatted}`;
  }

  return millimes < 0 ? `-${formatted}` : formatted;
}

function isSignificantDelta(delta: number, spentTotal: number): boolean {
  return (
    Math.abs(delta) >=
    Math.max(spentTotal * DELTA_TOTAL_SHARE, DELTA_MIN_MILLIMES)
  );
}

export function toInsightFingerprintInput(args: {
  current: MonthSummary;
  expenses: SerializedExpense[];
}): InsightFingerprintInput {
  let maxExpenseUpdatedAt: string | null = null;

  for (const expense of args.expenses) {
    if (maxExpenseUpdatedAt === null || expense.updatedAt > maxExpenseUpdatedAt) {
      maxExpenseUpdatedAt = expense.updatedAt;
    }
  }

  return {
    budgetUpdatedAt: args.current.budget?.updatedAt ?? null,
    expenseCount: args.expenses.length,
    spentTotal: args.current.spent,
    maxExpenseUpdatedAt,
  };
}

export function buildMonthlySummaryData(
  args: BuildMonthlySummaryDataArgs,
): MonthlySummaryData {
  const { month, now, current, previous, expenses } = args;
  const isCurrentMonth = month === currentMonthTunis(now);

  const budget = current.budget;
  const spentTotal = current.spent;
  const loyerTotal = current.totalsByCategory["LOYER"] ?? 0;
  const forecast =
    isCurrentMonth && spentTotal > 0
      ? forecastVariable(
          spentTotal,
          loyerTotal,
          dayOfMonthTunis(now),
          daysInMonth(month),
        )
      : null;
  const limit = budget?.limit ?? null;
  const overshootRisk =
    forecast !== null && limit !== null ? forecast > limit : null;
  const overshoot =
    overshootRisk === true && forecast !== null && limit !== null
      ? formatSignedTnd(forecast - limit)
      : null;

  const categories: MonthlySummaryCategory[] = (
    Object.entries(current.totalsByCategory) as [BudgetCategory, number][]
  )
    .filter(([, spent]) => spent > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, spent]) => {
      const prevSpent = previous.totalsByCategory[key] ?? 0;
      const delta = spent - prevSpent;

      return {
        key,
        label: BUDGET_CATEGORY_LABELS[key],
        spentTnd: millimesToTnd(spent),
        share: current.sharesByCategory[key] ?? 0,
        prevSpentTnd: millimesToTnd(prevSpent),
        deltaTnd: formatSignedTnd(delta),
        deltaPercent:
          prevSpent > 0 ? Math.round((delta / prevSpent) * 1000) / 10 : null,
      };
    });

  const topExpenses: MonthlySummaryTopExpense[] = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((expense) => ({
      category: expense.category,
      label: BUDGET_CATEGORY_LABELS[expense.category],
      amountTnd: millimesToTnd(expense.amount),
      dateIso: expense.date.slice(0, 10),
    }));

  const hasComparison = Object.keys(previous.totalsByCategory).length > 0;

  let biggestIncrease: MonthlySummaryNotable | null = null;
  let biggestDecrease: MonthlySummaryNotable | null = null;
  let newCategory: MonthlySummaryNewCategory | null = null;
  let biggestIncreaseDelta = 0;
  let biggestDecreaseDelta = 0;
  let newCategorySpent = 0;

  if (hasComparison) {
    for (const category of categories) {
      const key = category.key;
      const spent = current.totalsByCategory[key];
      const prevSpent = previous.totalsByCategory[key] ?? 0;
      const delta = spent - prevSpent;

      if (prevSpent === 0) {
        if (
          isSignificantDelta(spent, spentTotal) &&
          spent > newCategorySpent
        ) {
          newCategorySpent = spent;
          newCategory = {
            key,
            label: category.label,
            spentTnd: category.spentTnd,
          };
        }

        continue;
      }

      if (!isSignificantDelta(delta, spentTotal)) {
        continue;
      }

      if (delta > 0 && delta > biggestIncreaseDelta) {
        biggestIncreaseDelta = delta;
        biggestIncrease = {
          key,
          label: category.label,
          deltaTnd: category.deltaTnd,
        };
      }

      if (delta < 0 && delta < biggestDecreaseDelta) {
        biggestDecreaseDelta = delta;
        biggestDecrease = {
          key,
          label: category.label,
          deltaTnd: category.deltaTnd,
        };
      }
    }
  }

  return {
    month,
    monthLabel: formatMonthLabel(month),
    prevMonthLabel: formatMonthLabel(previousMonth(month)),
    dayOfMonth: isCurrentMonth ? dayOfMonthTunis(now) : null,
    daysInMonth: daysInMonth(month),
    currency: "TND",
    budget: {
      limitTnd: limit !== null ? millimesToTnd(limit) : null,
      incomeTnd:
        budget?.income !== undefined ? millimesToTnd(budget.income) : null,
      spentTnd: millimesToTnd(spentTotal),
      remainingTnd: budget ? millimesToTnd(current.remaining) : null,
      percentUsed: budget ? current.percentUsed : null,
      alertLevel: budget ? current.alertLevel : null,
      forecastTnd: forecast !== null ? millimesToTnd(forecast) : null,
      overshootRisk,
      overshootTnd: overshoot,
    },
    categories,
    topExpenses,
    notables: {
      hasComparison,
      biggestIncrease,
      biggestDecrease,
      newCategory,
    },
  };
}

export function buildTemplateSummary(data: MonthlySummaryData): string {
  const lines: string[] = [];

  if (data.categories.length === 0) {
    lines.push("Vous n'avez aucune dépense enregistrée ce mois-ci.");

    if (data.budget.limitTnd === null) {
      lines.push("Aucun plafond n'est défini pour ce mois.");
    }

    return lines.join("\n");
  }

  const limitSuffix =
    data.budget.limitTnd !== null
      ? ` sur un plafond de ${data.budget.limitTnd} TND`
      : "";
  lines.push(
    `Ce mois-ci, vous avez dépensé ${data.budget.spentTnd} TND${limitSuffix}.`,
  );

  const topCategories = data.categories
    .slice(0, 3)
    .map((category) => `${category.label} ${category.spentTnd} TND`)
    .join(", ");
  lines.push(`Répartition : ${topCategories}.`);

  const changes: string[] = [];
  const prevMonth = data.prevMonthLabel.toLowerCase();

  if (data.notables.biggestIncrease) {
    changes.push(
      `Plus forte hausse vs ${prevMonth} : ${data.notables.biggestIncrease.label} (${data.notables.biggestIncrease.deltaTnd} TND)`,
    );
  }

  if (data.notables.biggestDecrease) {
    changes.push(
      `plus forte baisse : ${data.notables.biggestDecrease.label} (${data.notables.biggestDecrease.deltaTnd} TND)`,
    );
  }

  if (data.notables.newCategory) {
    changes.push(
      `${data.notables.newCategory.label} apparaît ce mois-ci (${data.notables.newCategory.spentTnd} TND)`,
    );
  }

  if (changes.length > 0) {
    lines.push(`${changes.join(" · ")}.`);
  }

  const topExpense = data.topExpenses[0];

  if (topExpense) {
    const dayLabel = formatShortDayLabel(topExpense.dateIso).replace(/\.$/, "");
    lines.push(
      `Plus grosse dépense : ${topExpense.label} ${topExpense.amountTnd} TND le ${dayLabel}.`,
    );
  }

  if (data.budget.limitTnd !== null && data.budget.remainingTnd !== null) {
    const daysLeft =
      data.dayOfMonth !== null ? data.daysInMonth - data.dayOfMonth : null;
    const daysSuffix =
      daysLeft !== null && daysLeft > 0
        ? ` pour les ${daysLeft} prochains jours`
        : "";
    const percentSuffix =
      data.budget.percentUsed !== null
        ? ` (${data.budget.percentUsed.toLocaleString("fr-FR")} % utilisés)`
        : "";
    lines.push(
      `Reste à dépenser : ${data.budget.remainingTnd} TND${daysSuffix}${percentSuffix}.`,
    );
  } else {
    lines.push("Aucun plafond n'est défini pour ce mois.");
  }

  if (data.budget.overshootRisk === true && data.budget.overshootTnd !== null) {
    lines.push(
      `À ce rythme, vous risquez de dépasser le plafond d'environ ${data.budget.overshootTnd.replace("+", "")} TND en fin de mois.`,
    );
  }

  return lines.join("\n");
}
