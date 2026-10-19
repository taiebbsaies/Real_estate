import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getUserId } from "@/lib/budget/current-user";
import {
  currentMonthTunis,
  dayOfMonthTunis,
  daysInMonth,
  daysLeftInMonthTunis,
  forecastVariable,
  nextMonth,
  previousMonth,
} from "@/lib/budget/calculations";
import {
  getMonthSummary,
  listExpenses,
  type MonthSummary,
  type SerializedExpense,
} from "@/lib/budget/queries";
import {
  BUDGET_CATEGORY_LABELS,
  type BudgetCategory,
} from "@/lib/constants/budget";
import {
  formatMonthLabel,
  formatShortDayLabel,
  formatTnd,
} from "@/lib/budget/format";
import {
  AlertTriangleIcon,
  CategoryIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  NotebookIcon,
  TrendingUpIcon,
} from "../_components/icons";

export const metadata: Metadata = {
  title: "Budget — HomeCheck",
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6" aria-hidden="true">
      <div className="h-8 w-40 animate-pulse rounded bg-[var(--budget-skeleton)]" />
      <div className="h-72 animate-pulse rounded-[16px] bg-[var(--budget-skeleton)]" />
      <div className="h-28 animate-pulse rounded-[16px] bg-[var(--budget-skeleton)]" />
      <div className="h-48 animate-pulse rounded-[16px] bg-[var(--budget-skeleton)]" />
    </div>
  );
}

function alertBarColor(level: MonthSummary["alertLevel"]): string {
  if (level === "exceeded") {
    return "var(--budget-primary)";
  }
  if (level === "warning") {
    return "var(--budget-warning)";
  }
  return "var(--budget-secondary)";
}

function ForecastCard({
  summary,
  month,
}: {
  summary: MonthSummary;
  month: string;
}) {
  const fixedSpent = summary.totalsByCategory["LOYER"] ?? 0;
  const forecast = forecastVariable(
    summary.spent,
    fixedSpent,
    dayOfMonthTunis(),
    daysInMonth(month),
  );

  const limit = summary.budget?.limit ?? 0;
  const hasData = summary.spent > 0;
  const onTrack = forecast <= limit;
  const forecastWidth = limit > 0
    ? Math.min(100, Math.max(0, Math.round((forecast / limit) * 100)))
    : 0;

  return (
    <section className="flex flex-col gap-4 rounded-[16px] border border-[var(--budget-border)] bg-[var(--budget-surface)] p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUpIcon className="h-5 w-5 text-[var(--budget-muted)]" />
          <h2 className="budget-heading text-[18px] font-medium text-[var(--budget-secondary)]">
            Prévision de fin de mois
          </h2>
        </div>
        {hasData &&
          (onTrack ? (
            <span className="flex items-center gap-1 rounded-full border border-[var(--budget-secondary)]/10 bg-[var(--budget-secondary-soft)] px-2 py-[3px] text-[11px] font-medium text-[var(--budget-secondary)]">
              <CheckCircleIcon className="h-3.5 w-3.5" />
              Sur la bonne voie
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full border border-[var(--budget-warning)]/20 bg-[var(--budget-warning-soft)] px-2 py-[3px] text-[11px] font-medium text-[var(--budget-warning)]">
              <AlertTriangleIcon className="h-3.5 w-3.5" />
              Dépassement probable (≈ {formatTnd(forecast - limit)})
            </span>
          ))}
      </div>

      {hasData ? (
        <>
          <div className="flex flex-col gap-1">
            <span className="budget-tabular text-[15px] font-medium">
              ≈ {formatTnd(forecast)} projetés
            </span>
            <span className="text-[13px] text-[var(--budget-muted)]">
              {onTrack
                ? `Marge estimée de ${formatTnd(limit - forecast)} sur le plafond.`
                : `Soit ≈ ${formatTnd(forecast - limit)} au-dessus du plafond.`}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-[var(--budget-border)]"
            role="img"
            aria-label={`Prévision à ${forecastWidth} % du plafond`}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${forecastWidth}%`,
                backgroundColor: onTrack
                  ? "var(--budget-secondary)"
                  : "var(--budget-warning)",
              }}
            />
          </div>
        </>
      ) : (
        <p className="text-[13px] text-[var(--budget-muted)]">
          Pas encore assez de données pour estimer la fin du mois.
        </p>
      )}

      <p className="text-[12px] italic text-[var(--budget-muted)]">
        Le loyer est exclu du calcul du rythme.
      </p>
    </section>
  );
}

function AlertBanner({
  summary,
  isPastMonth,
  isCurrentMonth,
  daysLeft,
}: {
  summary: MonthSummary;
  isPastMonth: boolean;
  isCurrentMonth: boolean;
  daysLeft: number | null;
}) {
  const percent = summary.percentUsed.toLocaleString("fr-FR");

  let text: string;
  if (isPastMonth) {
    text =
      summary.remaining < 0
        ? `Mois terminé — budget dépassé de ${formatTnd(Math.abs(summary.remaining))}.`
        : "Mois terminé — budget respecté.";
  } else if (summary.alertLevel === "exceeded") {
    text = `Budget dépassé de ${formatTnd(Math.abs(summary.remaining))}.`;
  } else if (summary.alertLevel === "warning") {
    text = `Vous avez utilisé ${percent} % de votre budget.`;
  } else {
    text =
      isCurrentMonth && daysLeft !== null
        ? `Il vous reste ${formatTnd(summary.remaining)} pour ${daysLeft} prochains jours.`
        : `Il vous reste ${formatTnd(summary.remaining)}.`;
  }

  const isError = !isPastMonth && summary.alertLevel === "exceeded";
  const isPastExceeded = isPastMonth && summary.remaining < 0;
  const isWarning = !isPastMonth && summary.alertLevel === "warning";

  const styles = isError || isPastExceeded
    ? "border-[var(--budget-primary)]/20 bg-[var(--budget-primary-soft)] text-[var(--budget-primary)]"
    : isWarning
      ? "border-[var(--budget-warning)]/20 bg-[var(--budget-warning-soft)] text-[var(--budget-warning)]"
      : "border-[var(--budget-secondary)]/10 bg-[var(--budget-secondary-soft)] text-[var(--budget-secondary)]";

  return (
    <div className={`flex items-start gap-2 rounded-xl border p-3 ${styles}`}>
      {isError || isPastExceeded || isWarning ? (
        <AlertTriangleIcon className="mt-[1px] h-4 w-4 shrink-0" />
      ) : (
        <CheckCircleIcon className="mt-[1px] h-4 w-4 shrink-0" />
      )}
      <p className="text-[13px] font-medium leading-snug">{text}</p>
    </div>
  );
}

async function HomeContent({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const params = await searchParams;
  const rawMonth = typeof params.month === "string" ? params.month : "";
  const month = MONTH_PATTERN.test(rawMonth) ? rawMonth : currentMonthTunis();

  const userId = await getUserId();
  const [summary, expenses] = await Promise.all([
    getMonthSummary(userId, month),
    listExpenses(userId, { month }),
  ]);

  const monthLabel = formatMonthLabel(month);
  const nowMonth = currentMonthTunis();
  const isCurrentMonth = month === nowMonth;
  const isPastMonth = month < nowMonth;
  const daysLeft = isCurrentMonth ? daysLeftInMonthTunis() : null;

  const percentWidth = Math.min(100, Math.max(0, Math.round(summary.percentUsed)));
  const categories = (Object.entries(summary.totalsByCategory) as [
    BudgetCategory,
    number,
  ][])
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1]);
  const recentExpenses = expenses.slice(0, 5);

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 md:pt-10">
      <header className="flex flex-col gap-1">
        <h1 className="budget-heading text-[28px] font-semibold tracking-tight text-[var(--budget-secondary)]">
          Budget
        </h1>
        <div className="-ml-2 flex items-center gap-1">
          <Link
            href={`/budget?month=${previousMonth(month)}`}
            aria-label="Mois précédent"
            className="flex h-11 w-11 items-center justify-center text-[var(--budget-muted)] transition-colors hover:text-[var(--budget-text)]"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <span className="text-[16px] font-medium">{monthLabel}</span>
          <Link
            href={`/budget?month=${nextMonth(month)}`}
            aria-label="Mois suivant"
            className="flex h-11 w-11 items-center justify-center text-[var(--budget-muted)] transition-colors hover:text-[var(--budget-text)]"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {summary.budget ? (
        <section className="flex flex-col gap-5 rounded-[16px] border border-[var(--budget-border)] bg-[var(--budget-surface)] p-5">
          <div className="flex flex-col items-center gap-1 py-2">
            <span className="text-[13px] font-medium text-[var(--budget-muted)]">
              Reste à dépenser
            </span>
            <span
              className={`budget-tabular budget-heading text-[40px] font-semibold leading-none tracking-tight ${
                summary.remaining < 0
                  ? "text-[var(--budget-primary)]"
                  : "text-[var(--budget-secondary)]"
              }`}
            >
              {formatTnd(summary.remaining).replace(" TND", "")}
            </span>
            <span className="mt-1 text-[13px] font-medium uppercase tracking-widest text-[var(--budget-muted)]">
              TND
            </span>
          </div>

          <div className="flex items-center justify-between px-4 text-center">
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-[var(--budget-muted)]">Plafond</span>
              <span className="budget-tabular text-[14px] font-semibold">
                {formatTnd(summary.budget.limit)}
              </span>
            </div>
            <div className="h-8 w-px bg-[var(--budget-border-strong)]" />
            <div className="flex flex-col gap-1">
              <span className="text-[12px] text-[var(--budget-muted)]">Dépensé</span>
              <span className="budget-tabular text-[14px] font-semibold">
                {formatTnd(summary.spent)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div
              className="h-[14px] overflow-hidden rounded-full bg-[var(--budget-border)]"
              role="progressbar"
              aria-label="Part du plafond utilisée"
              aria-valuenow={Math.round(summary.percentUsed)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${percentWidth}%`,
                  backgroundColor: alertBarColor(summary.alertLevel),
                }}
              />
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] text-[var(--budget-muted)]">
                {summary.percentUsed.toLocaleString("fr-FR")} % utilisés
              </span>
              <span className="budget-tabular text-[12px] font-medium text-[var(--budget-secondary)]">
                {formatTnd(summary.budget.limit)}
              </span>
            </div>
          </div>

          <AlertBanner
            summary={summary}
            isPastMonth={isPastMonth}
            isCurrentMonth={isCurrentMonth}
            daysLeft={daysLeft}
          />

          <Link
            href={`/budget/mois?month=${month}`}
            className="flex h-11 items-center justify-center rounded-xl border border-[var(--budget-border-strong)] text-[14px] font-medium transition-colors hover:bg-[var(--budget-bg)]"
          >
            Modifier le budget
          </Link>
        </section>
      ) : (
        <section className="flex flex-col items-center gap-4 rounded-[16px] border border-[var(--budget-border)] bg-[var(--budget-surface)] p-5 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--budget-secondary-soft)]">
            <NotebookIcon className="h-7 w-7 text-[var(--budget-secondary)]" />
          </div>
          <h2 className="budget-heading text-[20px] font-semibold text-[var(--budget-secondary)]">
            Définissez votre budget pour {monthLabel.toLowerCase()}
          </h2>
          <p className="max-w-[280px] text-[14px] leading-relaxed text-[var(--budget-muted)]">
            Fixez un plafond mensuel pour suivre vos dépenses de logement.
          </p>
          <Link
            href={`/budget/mois?month=${month}`}
            className="flex h-11 items-center rounded-xl bg-[var(--budget-primary)] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--budget-primary-dark)]"
          >
            Créer le budget
          </Link>
        </section>
      )}

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="flex flex-col gap-4 lg:gap-6">
          {isCurrentMonth && summary.budget && (
            <ForecastCard summary={summary} month={month} />
          )}

      <section className="flex flex-col gap-5 rounded-[16px] border border-[var(--budget-border)] bg-[var(--budget-surface)] p-5">
        <h2 className="budget-heading text-[18px] font-medium text-[var(--budget-secondary)]">
          Répartition par catégorie
        </h2>
        {categories.length === 0 ? (
          <p className="text-[13px] text-[var(--budget-muted)]">
            Aucune dépense ce mois-ci.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {categories.map(([category, total]) => (
              <div key={category} className="flex flex-col gap-[6px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      category={category}
                      className="h-5 w-5 text-[var(--budget-muted)]"
                    />
                    <span className="text-[14px] font-medium">
                      {BUDGET_CATEGORY_LABELS[category]}
                    </span>
                  </div>
                  <span className="budget-tabular text-[14px] font-medium">
                    {formatTnd(total)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="h-[6px] flex-1 overflow-hidden rounded-full bg-[var(--budget-border)]"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-[var(--budget-text)]"
                      style={{
                        width: `${summary.sharesByCategory[category] ?? 0}%`,
                      }}
                    />
                  </div>
                  <span className="budget-tabular w-12 text-right text-[11px] text-[var(--budget-muted)]">
                    {(summary.sharesByCategory[category] ?? 0).toLocaleString("fr-FR")} %
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
        </div>

        {recentExpenses.length > 0 && (
        <section className="flex flex-col gap-4 rounded-[16px] border border-[var(--budget-border)] bg-[var(--budget-surface)] p-5">
          <h2 className="budget-heading text-[18px] font-medium text-[var(--budget-secondary)]">
            Dernières dépenses
          </h2>
          <div className="flex flex-col gap-4">
            {recentExpenses.map((expense: SerializedExpense) => (
              <Link
                key={expense.id}
                href={`/budget/depenses/${expense.id}/modifier`}
                className="group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
                    <CategoryIcon
                      category={expense.category}
                      className="h-5 w-5 text-[var(--budget-muted)]"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-medium">
                      {expense.note?.trim() !== "" && expense.note
                        ? expense.note
                        : BUDGET_CATEGORY_LABELS[expense.category]}
                    </span>
                    <span className="text-[12px] text-[var(--budget-muted)]">
                      {formatShortDayLabel(expense.date.slice(0, 10))}
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
          <Link
            href={`/budget/depenses?month=${month}`}
            className="flex h-11 items-center justify-center border-t border-[var(--budget-border)] pt-2 text-[14px] font-medium text-[var(--budget-primary)] transition-colors hover:text-[var(--budget-primary-dark)]"
          >
            Voir tout
          </Link>
        </section>
        )}
      </div>
    </div>
  );
}

export default async function BudgetHomePage({
  searchParams,
}: PageProps<"/budget">) {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}
