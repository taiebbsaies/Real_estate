import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getUserId } from "@/lib/budget/current-user";
import { currentMonthTunis } from "@/lib/budget/calculations";
import { getHistory, type HistoryEntry } from "@/lib/budget/queries";
import { formatMonthLabel, formatTnd } from "@/lib/budget/format";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  HistoryIcon,
} from "../../_components/icons";
import Card from "../../_components/ui/Card";
import EmptyState from "../../_components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Historique",
};

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6" aria-hidden="true">
      <div className="h-8 w-36 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-36 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-24 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-24 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

function formatMonthShortLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const label = new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function progressColor(entry: HistoryEntry): string {
  return entry.status === "depasse"
    ? "bg-red-500 dark:bg-red-400"
    : "bg-emerald-500/60 dark:bg-emerald-400/60";
}

function HistoryBadge({ entry, isCurrent }: { entry: HistoryEntry; isCurrent: boolean }) {
  if (isCurrent) {
    return (
      <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
        En cours
      </span>
    );
  }

  if (entry.status === "depasse") {
    const overshoot = entry.spent - entry.limit;
    const overshootPercent = Math.round(entry.percentUsed - 100);

    return (
      <span className="flex min-w-0 items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-left text-[11px] font-bold text-red-600 dark:text-red-400">
        <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
        <span>
          Dépassé de {formatTnd(overshoot).replace(" TND", "")} TND
          (+{overshootPercent} %)
        </span>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
      <CheckCircleIcon className="h-3.5 w-3.5" />
      Respecté
    </span>
  );
}

async function HistoryContent() {
  await connection();
  const userId = await getUserId();
  const entries = await getHistory(userId, 6);

  const nowMonth = currentMonthTunis();
  const isCurrent = (entry: HistoryEntry) => entry.month === nowMonth;
  const completeEntries = entries.filter((entry) => !isCurrent(entry));
  const average = completeEntries.length > 0
    ? Math.round(
        completeEntries.reduce((sum, entry) => sum + entry.spent, 0) /
          completeEntries.length,
      )
    : 0;
  const maxSpent = Math.max(...entries.map((entry) => entry.spent), 1);
  const chronologicalBars = [...completeEntries].reverse();

  return (
    <div className="flex flex-col gap-4 px-4 pt-6 md:pt-10">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Historique
        </h1>
      </header>

      {entries.length === 0 ? (
        <Card padded={false} className="p-6">
          <EmptyState
            icon={HistoryIcon}
            title="Votre historique apparaîtra après votre premier budget."
            actionHref="/budget/mois"
            actionLabel="Créer un budget"
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
          {completeEntries.length > 0 && (
            <Card className="flex flex-col gap-4">
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                Vue d&apos;ensemble
              </h2>
              <div className="flex items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Moyenne mensuelle
                  </span>
                  <span className="tabular-nums text-2xl font-extrabold leading-none tracking-tight text-zinc-950 dark:text-zinc-50">
                    {formatTnd(average).replace(" TND", "")}
                    <span className="ml-1 text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
                      TND
                    </span>
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    sur {completeEntries.length} mois
                    {completeEntries.length > 1 ? " complets" : " complet"}
                  </span>
                </div>
                <div
                  className="flex h-16 items-end gap-2"
                  aria-hidden="true"
                >
                  {chronologicalBars.map((entry) => (
                    <div key={entry.month} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-5 rounded-t ${progressColor(entry)}`}
                        style={{
                          height: `${Math.max(12, Math.round((entry.spent / maxSpent) * 100))}%`,
                        }}
                      />
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {formatMonthShortLabel(entry.month)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          <div className="flex flex-col gap-4">
            {entries.map((entry) => {
              const percentWidth = Math.min(
                100,
                Math.max(0, Math.round(entry.percentUsed)),
              );

              return (
                <Link
                  key={entry.month}
                  href={`/budget/depenses?month=${entry.month}`}
                  className="group flex flex-col gap-3 rounded-2xl border border-zinc-200/90 bg-white/90 p-5 shadow-xs backdrop-blur-md transition-colors hover:border-zinc-300 dark:border-zinc-800/90 dark:bg-[#111114]/90 dark:hover:border-zinc-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {formatMonthLabel(entry.month)}
                    </span>
                    <div className="flex items-center gap-1">
                      <HistoryBadge entry={entry} isCurrent={isCurrent(entry)} />
                      <ChevronRightIcon className="h-4 w-4 shrink-0 text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-300" />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="tabular-nums text-[15px] font-medium text-zinc-900 dark:text-zinc-100">
                      {formatTnd(entry.spent)}
                      <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                        {" "}
                        / {formatTnd(entry.limit)}
                      </span>
                    </span>
                    <span className="tabular-nums text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {entry.percentUsed.toLocaleString("fr-FR")} %
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"
                    role="progressbar"
                    aria-label={`Part du plafond utilisée en ${formatMonthLabel(entry.month)}`}
                    aria-valuenow={Math.round(entry.percentUsed)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className={`h-full rounded-full ${progressColor(entry)}`}
                      style={{ width: `${percentWidth}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<HistorySkeleton />}>
      <HistoryContent />
    </Suspense>
  );
}
