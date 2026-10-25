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
import Card from "../_components/ui/Card";
import Alert from "../_components/ui/Alert";
import EmptyState from "../_components/ui/EmptyState";
import { ButtonLink } from "../_components/ui/Button";

export const metadata: Metadata = {
  title: "Budget",
};

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6" aria-hidden="true">
      <div className="h-8 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-72 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-28 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-48 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

function alertBarColor(level: MonthSummary["alertLevel"]): string {
  if (level === "exceeded") {
    return "bg-red-500 dark:bg-red-400";
  }
  if (level === "warning") {
    return "bg-amber-500 dark:bg-amber-400";
  }
  return "bg-emerald-500 dark:bg-emerald-400";
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
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUpIcon className="h-5 w-5 text-zinc-400" />
          <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
            Prévision de fin de mois
          </h2>
        </div>
        {hasData &&
          (onTrack ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircleIcon className="h-3.5 w-3.5" />
              Sur la bonne voie
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-600 dark:text-amber-400">
              <AlertTriangleIcon className="h-3.5 w-3.5" />
              Dépassement probable (≈ {formatTnd(forecast - limit)})
            </span>
          ))}
      </div>

      {hasData ? (
        <>
          <div className="flex flex-col gap-1">
            <span className="tabular-nums text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
              ≈ {formatTnd(forecast)} projetés
            </span>
            <span className="text-[13px] text-zinc-500 dark:text-zinc-400">
              {onTrack
                ? `Marge estimée de ${formatTnd(limit - forecast)} sur le plafond.`
                : `Soit ≈ ${formatTnd(forecast - limit)} au-dessus du plafond.`}
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
            role="img"
            aria-label={`Prévision à ${forecastWidth} % du plafond`}
          >
            <div
              className={`h-full rounded-full ${
                onTrack
                  ? "bg-emerald-500 dark:bg-emerald-400"
                  : "bg-amber-500 dark:bg-amber-400"
              }`}
              style={{ width: `${forecastWidth}%` }}
            />
          </div>
        </>
      ) : (
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
          Pas encore assez de données pour estimer la fin du mois.
        </p>
      )}

      <p className="text-xs italic text-zinc-500 dark:text-zinc-400">
        Le loyer est exclu du calcul du rythme.
      </p>
    </Card>
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
  const kind = isError || isPastExceeded
    ? "error"
    : isWarning
      ? "warning"
      : "success";

  return (
    <Alert kind={kind} className="flex items-start gap-2">
      {isError || isPastExceeded || isWarning ? (
        <AlertTriangleIcon className="mt-[1px] h-4 w-4 shrink-0" />
      ) : (
        <CheckCircleIcon className="mt-[1px] h-4 w-4 shrink-0" />
      )}
      <p className="font-medium leading-snug">{text}</p>
    </Alert>
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
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Budget
        </h1>
        <div className="-ml-2 flex items-center gap-1">
          <Link
            href={`/budget?month=${previousMonth(month)}`}
            aria-label="Mois précédent"
            className="flex h-11 w-11 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
          <span className="text-base font-medium text-zinc-900 dark:text-zinc-100">
            {monthLabel}
          </span>
          <Link
            href={`/budget?month=${nextMonth(month)}`}
            aria-label="Mois suivant"
            className="flex h-11 w-11 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </Link>
        </div>
      </header>

      {summary.budget ? (
        <Card className="flex flex-col gap-5">
          <div className="flex flex-col items-center gap-1 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Reste à dépenser
            </span>
            <span
              className={`tabular-nums text-[40px] font-extrabold leading-none tracking-tight ${
                summary.remaining < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-zinc-950 dark:text-zinc-50"
              }`}
            >
              {formatTnd(summary.remaining).replace(" TND", "")}
            </span>
            <span className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              TND
            </span>
          </div>

          <div className="flex items-center justify-between px-4 text-center">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Plafond</span>
              <span className="tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {formatTnd(summary.budget.limit)}
              </span>
            </div>
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">Dépensé</span>
              <span className="tabular-nums text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {formatTnd(summary.spent)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div
              className="h-3.5 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
              role="progressbar"
              aria-label="Part du plafond utilisée"
              aria-valuenow={Math.round(summary.percentUsed)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full rounded-full ${alertBarColor(summary.alertLevel)}`}
                style={{ width: `${percentWidth}%` }}
              />
            </div>
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {summary.percentUsed.toLocaleString("fr-FR")} % utilisés
              </span>
              <span className="tabular-nums text-xs font-medium text-zinc-900 dark:text-zinc-100">
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

          <ButtonLink
            href={`/budget/mois?month=${month}`}
            variant="secondary"
            className="w-full"
          >
            Modifier le budget
          </ButtonLink>
        </Card>
      ) : (
        <Card padded={false} className="p-6">
          <EmptyState
            icon={NotebookIcon}
            title={`Définissez votre budget pour ${monthLabel.toLowerCase()}`}
            description="Fixez un plafond mensuel pour suivre vos dépenses de logement."
            actionHref={`/budget/mois?month=${month}`}
            actionLabel="Créer le budget"
          />
        </Card>
      )}

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="flex flex-col gap-4 lg:gap-6">
          {isCurrentMonth && summary.budget && (
            <ForecastCard summary={summary} month={month} />
          )}

      <Card className="flex flex-col gap-5">
        <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
          Répartition par catégorie
        </h2>
        {categories.length === 0 ? (
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
            Aucune dépense ce mois-ci.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {categories.map(([category, total]) => (
              <div key={category} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CategoryIcon
                      category={category}
                      className="h-5 w-5 text-zinc-500 dark:text-zinc-400"
                    />
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {BUDGET_CATEGORY_LABELS[category]}
                    </span>
                  </div>
                  <span className="tabular-nums text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {formatTnd(total)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
                      style={{
                        width: `${summary.sharesByCategory[category] ?? 0}%`,
                      }}
                    />
                  </div>
                  <span className="tabular-nums w-12 text-right text-[11px] text-zinc-500 dark:text-zinc-400">
                    {(summary.sharesByCategory[category] ?? 0).toLocaleString("fr-FR")} %
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
        </div>

        {recentExpenses.length > 0 && (
        <Card className="flex flex-col gap-4">
          <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
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
                      {formatShortDayLabel(expense.date.slice(0, 10))}
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
          <Link
            href={`/budget/depenses?month=${month}`}
            className="flex h-11 items-center justify-center border-t border-zinc-200 pt-2 text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-700 dark:border-zinc-800 dark:text-emerald-400 dark:hover:text-emerald-300"
          >
            Voir tout
          </Link>
        </Card>
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
