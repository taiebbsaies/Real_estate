import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { getUserId } from "@/lib/budget/current-user";
import {
  currentMonth,
  nextMonth,
  previousMonth,
} from "@/lib/budget/calculations";
import {
  getMonthSummary,
  listExpenses,
  type SerializedExpense,
} from "@/lib/budget/queries";
import {
  BUDGET_CATEGORIES,
  BUDGET_CATEGORY_LABELS,
  type BudgetCategory,
} from "@/lib/constants/budget";
import { formatDayLabel, formatMonthLabel, formatTnd } from "@/lib/budget/format";
import {
  CategoryIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ReceiptIcon,
} from "../../_components/icons";

export const metadata: Metadata = {
  title: "Dépenses — HomeCheck",
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

type ExpenseGroup = {
  day: string;
  expenses: SerializedExpense[];
  total: number;
};

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-5 px-4 pt-6" aria-hidden="true">
      <div className="h-8 w-40 animate-pulse rounded bg-[var(--budget-skeleton)]" />
      <div className="h-9 w-64 animate-pulse rounded-full bg-[var(--budget-skeleton)]" />
      <div className="h-20 animate-pulse rounded-[16px] bg-[var(--budget-skeleton)]" />
      <div className="h-20 animate-pulse rounded-[16px] bg-[var(--budget-skeleton)]" />
      <div className="h-20 animate-pulse rounded-[16px] bg-[var(--budget-skeleton)] w-[90%]" />
    </div>
  );
}

function buildHref(month: string, category: BudgetCategory | undefined): string {
  const params = new URLSearchParams({ month });
  if (category) {
    params.set("category", category);
  }
  return `/budget/depenses?${params.toString()}`;
}

function alertBarColor(level: "normal" | "warning" | "exceeded"): string {
  if (level === "exceeded") {
    return "var(--budget-primary)";
  }
  if (level === "warning") {
    return "var(--budget-warning)";
  }
  return "var(--budget-secondary)";
}

async function ExpensesContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawMonth = typeof params.month === "string" ? params.month : "";
  const month = MONTH_PATTERN.test(rawMonth) ? rawMonth : currentMonth();
  const rawCategory = typeof params.category === "string" ? params.category : "";
  const category = (BUDGET_CATEGORIES as readonly string[]).includes(rawCategory)
    ? (rawCategory as BudgetCategory)
    : undefined;

  const userId = await getUserId();
  const [expenses, summary] = await Promise.all([
    listExpenses(userId, { month, category }),
    getMonthSummary(userId, month),
  ]);

  const groups: ExpenseGroup[] = [];
  const groupsByDay = new Map<string, ExpenseGroup>();

  for (const expense of expenses) {
    const day = expense.date.slice(0, 10);
    let group = groupsByDay.get(day);

    if (!group) {
      group = { day, expenses: [], total: 0 };
      groupsByDay.set(day, group);
      groups.push(group);
    }

    group.expenses.push(expense);
    group.total += expense.amount;
  }

  const monthLabel = formatMonthLabel(month);
  const percentWidth = Math.min(100, Math.max(0, summary.percentUsed));

  return (
    <div className="flex flex-col gap-5 px-4 pt-6">
      <header className="flex flex-col gap-1">
        <h1 className="budget-heading text-[28px] font-semibold tracking-tight text-[var(--budget-secondary)]">
          Dépenses
        </h1>
        <div className="-ml-2 flex items-center gap-1">
          <Link
            href={buildHref(previousMonth(month), category)}
            aria-label="Mois précédent"
            className="flex h-11 w-11 items-center justify-center text-[var(--budget-muted)] transition-colors hover:text-[var(--budget-text)]"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <span className="text-[16px] font-medium">{monthLabel}</span>
          <Link
            href={buildHref(nextMonth(month), category)}
            aria-label="Mois suivant"
            className="flex h-11 w-11 items-center justify-center text-[var(--budget-muted)] transition-colors hover:text-[var(--budget-text)]"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <nav
        aria-label="Filtrer par catégorie"
        className="overflow-x-auto pb-1"
      >
        <div className="flex w-max gap-2">
          <Link
            href={buildHref(month, undefined)}
            aria-current={category === undefined ? "true" : undefined}
            className={`flex h-9 items-center whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors ${
              category === undefined
                ? "bg-[var(--budget-primary)] text-white"
                : "border border-[var(--budget-border)] bg-[var(--budget-surface)] text-[var(--budget-text)] hover:border-[var(--budget-border-strong)]"
            }`}
          >
            Toutes
          </Link>
          {BUDGET_CATEGORIES.map((item) => (
            <Link
              key={item}
              href={buildHref(month, item)}
              aria-current={category === item ? "true" : undefined}
              className={`flex h-9 items-center whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors ${
                category === item
                  ? "bg-[var(--budget-primary)] text-white"
                  : "border border-[var(--budget-border)] bg-[var(--budget-surface)] text-[var(--budget-text)] hover:border-[var(--budget-border-strong)]"
              }`}
            >
              {BUDGET_CATEGORY_LABELS[item]}
            </Link>
          ))}
        </div>
      </nav>

      {expenses.length === 0 ? (
        <section className="flex flex-col items-center gap-4 rounded-[16px] border border-[var(--budget-border)] bg-[var(--budget-surface)] p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--budget-border)] bg-[var(--budget-bg)]">
            <ReceiptIcon className="h-6 w-6 text-[var(--budget-muted)]" />
          </div>
          <p className="text-[14px] text-[var(--budget-muted)]">
            Aucune dépense enregistrée en {monthLabel.toLowerCase()}.
          </p>
          <Link
            href="/budget/depenses/nouvelle"
            className="flex h-11 items-center rounded-xl bg-[var(--budget-primary)] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--budget-primary-dark)]"
          >
            Ajouter une dépense
          </Link>
        </section>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.day} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--budget-muted)]">
                  {formatDayLabel(group.day)}
                </h2>
                <span className="budget-tabular text-[12px] text-[var(--budget-muted)]">
                  {formatTnd(group.total)}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {group.expenses.map((expense) => (
                  <Link
                    key={expense.id}
                    href={`/budget/depenses/${expense.id}/modifier`}
                    className="group flex items-center justify-between rounded-[16px] border border-[var(--budget-border)] bg-[var(--budget-surface)] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
                        <CategoryIcon
                          category={expense.category}
                          className="h-5 w-5 text-[var(--budget-muted)]"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-medium text-[var(--budget-text)]">
                          {expense.note?.trim() !== "" && expense.note
                            ? expense.note
                            : BUDGET_CATEGORY_LABELS[expense.category]}
                        </span>
                        <span className="text-[12px] text-[var(--budget-muted)]">
                          {BUDGET_CATEGORY_LABELS[expense.category]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="budget-tabular text-[14px] font-medium">
                        {formatTnd(expense.amount)}
                      </span>
                      <ChevronRightIcon className="h-4 w-4 text-[var(--budget-muted)] transition-colors group-hover:text-[var(--budget-text)]" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {summary.budget && expenses.length > 0 && (
        <section className="flex flex-col gap-2 rounded-[16px] border border-[var(--budget-border)] bg-[var(--budget-surface)] p-4">
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-medium">Total de {monthLabel.toLowerCase()}</span>
            <span className="budget-tabular text-[14px] font-semibold">
              {formatTnd(summary.spent)}{" "}
              <span className="font-normal text-[var(--budget-muted)]">
                / {formatTnd(summary.budget.limit)}
              </span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--budget-border)]">
            <div
              className="h-full rounded-full"
              style={{
                width: `${percentWidth}%`,
                backgroundColor: alertBarColor(summary.alertLevel),
              }}
            />
          </div>
          <div className="flex justify-end">
            <span className="budget-tabular text-[12px] font-medium text-[var(--budget-secondary)]">
              {summary.percentUsed.toLocaleString("fr-FR")} % du plafond
            </span>
          </div>
        </section>
      )}
    </div>
  );
}

export default async function ExpensesPage({
  searchParams,
}: PageProps<"/budget/depenses">) {
  return (
    <Suspense fallback={<ListSkeleton />}>
      <ExpensesContent searchParams={searchParams} />
    </Suspense>
  );
}
