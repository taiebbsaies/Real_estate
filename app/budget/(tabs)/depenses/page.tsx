import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getUserId } from "@/lib/budget/current-user";
import {
  currentMonthTunis,
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
import Card from "../../_components/ui/Card";
import EmptyState from "../../_components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Dépenses",
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
      <div className="h-8 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-9 w-64 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-20 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-20 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-20 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800 w-[90%]" />
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
    return "bg-red-500 dark:bg-red-400";
  }
  if (level === "warning") {
    return "bg-amber-500 dark:bg-amber-400";
  }
  return "bg-emerald-500 dark:bg-emerald-400";
}

async function ExpensesContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const rawMonth = typeof params.month === "string" ? params.month : "";
  const month = MONTH_PATTERN.test(rawMonth) ? rawMonth : currentMonthTunis();
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
    <div className="flex flex-col gap-5 px-4 pt-6 md:pt-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Dépenses
        </h1>
        <div className="-ml-2 flex items-center gap-1">
          <Link
            href={buildHref(previousMonth(month), category)}
            aria-label="Mois précédent"
            className="flex h-11 w-11 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            {monthLabel}
          </span>
          <Link
            href={buildHref(nextMonth(month), category)}
            aria-label="Mois suivant"
            className="flex h-11 w-11 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="flex w-full flex-col gap-5 md:mx-auto md:max-w-[720px]">
        <nav
          aria-label="Filtrer par catégorie"
          className="overflow-x-auto pb-1"
        >
          <div className="flex w-max gap-2 md:w-full md:flex-wrap">
          <Link
            href={buildHref(month, undefined)}
            aria-current={category === undefined ? "true" : undefined}
            className={`flex h-9 items-center whitespace-nowrap rounded-full px-4 text-[13px] font-medium transition-colors ${
              category === undefined
                ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                : "border border-zinc-200 bg-white/60 text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#151518]/60 dark:text-zinc-300 dark:hover:border-zinc-700"
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
                  ? "bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
                  : "border border-zinc-200 bg-white/60 text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#151518]/60 dark:text-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              {BUDGET_CATEGORY_LABELS[item]}
            </Link>
          ))}
        </div>
      </nav>

      {expenses.length === 0 ? (
        <Card padded={false} className="p-6">
          <EmptyState
            icon={ReceiptIcon}
            title={`Aucune dépense enregistrée en ${monthLabel.toLowerCase()}.`}
            actionHref="/budget/depenses/nouvelle"
            actionLabel="Ajouter une dépense"
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.day} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  {formatDayLabel(group.day)}
                </h2>
                <span className="tabular-nums text-xs text-zinc-500 dark:text-zinc-400">
                  {formatTnd(group.total)}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {group.expenses.map((expense) => (
                  <Link
                    key={expense.id}
                    href={`/budget/depenses/${expense.id}/modifier`}
                    className="group flex items-center justify-between rounded-2xl border border-zinc-200/90 bg-white/90 p-4 shadow-xs backdrop-blur-md transition-colors hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-[#111114]/90 dark:hover:border-zinc-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-xs dark:bg-zinc-800">
                        <CategoryIcon
                          category={expense.category}
                          className="h-5 w-5 text-zinc-500 dark:text-zinc-400"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {expense.note?.trim() !== "" && expense.note
                            ? expense.note
                            : BUDGET_CATEGORY_LABELS[expense.category]}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {BUDGET_CATEGORY_LABELS[expense.category]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {formatTnd(expense.amount)}
                      </span>
                      <ChevronRightIcon className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-300" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {summary.budget && expenses.length > 0 && (
        <Card padded={false} className="flex-col gap-2 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Total de {monthLabel.toLowerCase()}</span>
            <span className="tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {formatTnd(summary.spent)}{" "}
              <span className="font-normal text-zinc-500 dark:text-zinc-400">
                / {formatTnd(summary.budget.limit)}
              </span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className={`h-full rounded-full ${alertBarColor(summary.alertLevel)}`}
              style={{ width: `${percentWidth}%` }}
            />
          </div>
          <div className="flex justify-end">
            <span className="tabular-nums text-xs font-medium text-zinc-900 dark:text-zinc-100">
              {summary.percentUsed.toLocaleString("fr-FR")} % du plafond
            </span>
          </div>
        </Card>
      )}
      </div>
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
