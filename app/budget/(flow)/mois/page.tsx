import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getUserId } from "@/lib/budget/current-user";
import {
  currentMonthTunis,
  daysLeftInMonthTunis,
  nextMonth,
  previousMonth,
} from "@/lib/budget/calculations";
import { getBudget, getMonthSummary, getPreviousBudget } from "@/lib/budget/queries";
import { formatMonthLabel, formatTnd } from "@/lib/budget/format";
import BudgetForm from "./_components/BudgetForm";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  NotebookIcon,
} from "../../_components/icons";
import Card from "../../_components/ui/Card";
import Alert from "../../_components/ui/Alert";
import EmptyState from "../../_components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Budget du mois",
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function MonthSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-14" aria-hidden="true">
      <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-44 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-44 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

function AlertBanner({
  level,
  monthLabel,
  remainingMillimes,
  percent,
  daysLeft,
}: {
  level: "normal" | "warning" | "exceeded";
  monthLabel: string;
  remainingMillimes: number;
  percent: number;
  daysLeft: number | null;
}) {
  if (level === "exceeded") {
    return (
      <Alert kind="error">
        <p className="font-medium leading-snug">
          Plafond de {monthLabel} dépassé de {formatTnd(Math.abs(remainingMillimes))}.
        </p>
      </Alert>
    );
  }

  if (level === "warning") {
    return (
      <Alert kind="warning">
        <p className="font-medium leading-snug">
          Vous avez atteint {percent.toLocaleString("fr-FR")} % de votre plafond.
        </p>
      </Alert>
    );
  }

  return (
    <Alert kind="success">
      <p className="leading-snug">
        Il vous reste{" "}
        <span className="tabular-nums font-semibold">
          {formatTnd(remainingMillimes)}
        </span>
        {daysLeft !== null ? ` pour ${daysLeft} jour${daysLeft > 1 ? "s" : ""}` : ""}.
      </p>
    </Alert>
  );
}

async function MonthContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const rawMonth = typeof params.month === "string" ? params.month : "";
  const month = MONTH_PATTERN.test(rawMonth) ? rawMonth : currentMonthTunis();

  const userId = await getUserId();
  const [budget, previousBudget, summary] = await Promise.all([
    getBudget(userId, month),
    getPreviousBudget(userId, month),
    getMonthSummary(userId, month),
  ]);

  const monthLabel = formatMonthLabel(month);
  const isCurrentMonth = month === currentMonthTunis();
  const daysLeft = isCurrentMonth ? daysLeftInMonthTunis() : null;

  const percentWidth = Math.min(100, Math.max(0, summary.percentUsed));
  const barColor =
    summary.alertLevel === "exceeded"
      ? "bg-red-500 dark:bg-red-400"
      : summary.alertLevel === "warning"
        ? "bg-amber-500 dark:bg-amber-400"
        : "bg-emerald-500 dark:bg-emerald-400";

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 md:mx-auto md:w-full md:max-w-[560px] md:pt-10">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <Link
            href="/budget"
            aria-label="Retour à l'accueil du budget"
            className="-ml-2 flex h-11 w-11 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Budget du mois
          </h1>
        </div>
        <div className="-ml-2 flex items-center gap-1">
          <Link
            href={`/budget/mois?month=${previousMonth(month)}`}
            aria-label="Mois précédent"
            className="flex h-11 w-11 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            {monthLabel}
          </span>
          <Link
            href={`/budget/mois?month=${nextMonth(month)}`}
            aria-label="Mois suivant"
            className="flex h-11 w-11 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {!budget && (
        <Card padded={false} className="p-6">
          <EmptyState
            icon={NotebookIcon}
            title="Bienvenue dans votre budget"
            description="Fixez un plafond mensuel pour suivre vos dépenses de logement."
          />
        </Card>
      )}

      {budget && (
        <Card className="flex flex-col gap-4">
          <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
            Aperçu
          </h2>

          <div className="flex items-baseline justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Dépensé</span>
            <span
              className={`tabular-nums text-[15px] font-medium ${
                summary.remaining < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-zinc-900 dark:text-zinc-100"
              }`}
            >
              {formatTnd(summary.spent)}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Reste</span>
            <span
              className={`tabular-nums text-[15px] font-semibold ${
                summary.remaining < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {formatTnd(summary.remaining)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
              <div
                className={`h-full rounded-full ${barColor}`}
                style={{ width: `${percentWidth}%` }}
              />
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {daysLeft !== null
                  ? `${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}`
                  : formatTnd(budget.limit)}
              </span>
              <span className="tabular-nums text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {summary.percentUsed.toLocaleString("fr-FR")} %
              </span>
            </div>
          </div>

          <AlertBanner
            level={summary.alertLevel}
            monthLabel={monthLabel}
            remainingMillimes={summary.remaining}
            percent={summary.percentUsed}
            daysLeft={daysLeft}
          />
        </Card>
      )}

      <BudgetForm
        month={month}
        initialLimit={budget ? formatTnd(budget.limit).replace(" TND", "") : ""}
        initialIncome={
          budget?.income !== undefined
            ? formatTnd(budget.income).replace(" TND", "")
            : ""
        }
        hasBudget={budget !== null}
        previousBudget={
          previousBudget
            ? {
                limit: previousBudget.limit,
                ...(previousBudget.income !== undefined
                  ? { income: previousBudget.income }
                  : {}),
              }
            : null
        }
        previousMonthLabel={
          previousBudget ? formatMonthLabel(previousBudget.month) : ""
        }
      />
    </div>
  );
}

export default async function BudgetMonthPage({
  searchParams,
}: PageProps<"/budget/mois">) {
  return (
    <Suspense fallback={<MonthSkeleton />}>
      <MonthContent searchParams={searchParams} />
    </Suspense>
  );
}
