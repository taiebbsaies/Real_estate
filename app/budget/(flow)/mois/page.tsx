import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Budget du mois — HomeCheck",
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function MonthSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-14" aria-hidden="true">
      <div className="h-8 w-48 animate-pulse rounded bg-[var(--budget-skeleton)]" />
      <div className="h-44 animate-pulse rounded-[16px] bg-[var(--budget-skeleton)]" />
      <div className="h-44 animate-pulse rounded-[16px] bg-[var(--budget-skeleton)]" />
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
      <div className="flex items-start gap-2 rounded-xl border border-[var(--budget-primary)]/20 bg-[var(--budget-primary-soft)] p-3">
        <p className="text-[13px] font-medium leading-snug text-[var(--budget-primary)]">
          Plafond de {monthLabel} dépassé de {formatTnd(Math.abs(remainingMillimes))}.
        </p>
      </div>
    );
  }

  if (level === "warning") {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-[var(--budget-warning)]/20 bg-[var(--budget-warning-soft)] p-3">
        <p className="text-[13px] font-medium leading-snug text-[var(--budget-warning)]">
          Vous avez atteint {percent.toLocaleString("fr-FR")} % de votre plafond.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-xl border border-[var(--budget-secondary)]/10 bg-[var(--budget-secondary-soft)] p-3">
      <p className="text-[13px] leading-snug text-[var(--budget-secondary)]">
        Il vous reste{" "}
        <span className="budget-tabular font-semibold">
          {formatTnd(remainingMillimes)}
        </span>
        {daysLeft !== null ? ` pour ${daysLeft} jour${daysLeft > 1 ? "s" : ""}` : ""}.
      </p>
    </div>
  );
}

async function MonthContent({ searchParams }: { searchParams: SearchParams }) {
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
      ? "var(--budget-primary)"
      : summary.alertLevel === "warning"
        ? "var(--budget-warning)"
        : "var(--budget-secondary)";

  return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <Link
            href="/budget"
            aria-label="Retour à l'accueil du budget"
            className="-ml-2 flex h-11 w-11 items-center justify-center text-[var(--budget-muted)] transition-colors hover:text-[var(--budget-text)]"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="budget-heading text-[24px] font-semibold tracking-tight text-[var(--budget-secondary)]">
            Budget du mois
          </h1>
        </div>
        <div className="-ml-2 flex items-center gap-1">
          <Link
            href={`/budget/mois?month=${previousMonth(month)}`}
            aria-label="Mois précédent"
            className="flex h-11 w-11 items-center justify-center text-[var(--budget-muted)] transition-colors hover:text-[var(--budget-text)]"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <span className="text-[16px] font-medium">{monthLabel}</span>
          <Link
            href={`/budget/mois?month=${nextMonth(month)}`}
            aria-label="Mois suivant"
            className="flex h-11 w-11 items-center justify-center text-[var(--budget-muted)] transition-colors hover:text-[var(--budget-text)]"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {!budget && (
        <section className="flex flex-col items-center gap-4 rounded-[16px] border border-[var(--budget-border)] bg-[var(--budget-surface)] p-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--budget-secondary-soft)]">
            <NotebookIcon className="h-7 w-7 text-[var(--budget-secondary)]" />
          </div>
          <h2 className="budget-heading text-[22px] font-semibold text-[var(--budget-secondary)]">
            Bienvenue dans votre budget
          </h2>
          <p className="max-w-[280px] text-[14px] leading-relaxed text-[var(--budget-muted)]">
            Fixez un plafond mensuel pour suivre vos dépenses de logement.
          </p>
        </section>
      )}

      {budget && (
        <section className="flex flex-col gap-4 rounded-[16px] border border-[var(--budget-border)] bg-[var(--budget-surface)] p-5">
          <h2 className="budget-heading text-[18px] font-medium text-[var(--budget-secondary)]">
            Aperçu
          </h2>

          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-[var(--budget-muted)]">Dépensé</span>
            <span
              className={`budget-tabular text-[15px] font-medium ${
                summary.remaining < 0
                  ? "text-[var(--budget-primary)]"
                  : "text-[var(--budget-text)]"
              }`}
            >
              {formatTnd(summary.spent)}
            </span>
          </div>

          <div className="flex items-baseline justify-between">
            <span className="text-[12px] text-[var(--budget-muted)]">Reste</span>
            <span
              className={`budget-tabular text-[15px] font-semibold ${
                summary.remaining < 0
                  ? "text-[var(--budget-primary)]"
                  : "text-[var(--budget-secondary)]"
              }`}
            >
              {formatTnd(summary.remaining)}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="h-[10px] overflow-hidden rounded-full bg-[var(--budget-border)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${percentWidth}%`, backgroundColor: barColor }}
              />
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] text-[var(--budget-muted)]">
                {daysLeft !== null
                  ? `${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}`
                  : formatTnd(budget.limit)}
              </span>
              <span className="budget-tabular text-[12px] font-medium text-[var(--budget-secondary)]">
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
        </section>
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
