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

export const metadata: Metadata = {
  title: "Historique — HomeCheck",
};

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6" aria-hidden="true">
      <div className="h-8 w-36 animate-pulse rounded bg-[var(--budget-skeleton)]" />
      <div className="h-36 animate-pulse rounded-[16px] bg-[var(--budget-skeleton)]" />
      <div className="h-24 animate-pulse rounded-[16px] bg-[var(--budget-skeleton)]" />
      <div className="h-24 animate-pulse rounded-[16px] bg-[var(--budget-skeleton)]" />
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
    ? "var(--budget-primary)"
    : "var(--budget-secondary)";
}

function HistoryBadge({ entry, isCurrent }: { entry: HistoryEntry; isCurrent: boolean }) {
  if (isCurrent) {
    return (
      <span className="rounded-full border border-[var(--budget-border-strong)] px-2 py-[3px] text-[11px] font-medium text-[var(--budget-muted)]">
        En cours
      </span>
    );
  }

  if (entry.status === "depasse") {
    const overshoot = entry.spent - entry.limit;
    const overshootPercent = Math.round(entry.percentUsed - 100);

    return (
      <span className="flex items-center gap-1 rounded-full border border-[var(--budget-primary)]/20 bg-[var(--budget-primary-soft)] px-2 py-[3px] text-[11px] font-medium text-[var(--budget-primary)]">
        <AlertTriangleIcon className="h-3.5 w-3.5" />
        Dépassé de {formatTnd(overshoot).replace(" TND", "")} TND (+{overshootPercent} %)
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 rounded-full border border-[var(--budget-secondary)]/10 bg-[var(--budget-secondary-soft)] px-2 py-[3px] text-[11px] font-medium text-[var(--budget-secondary)]">
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
        <h1 className="budget-heading text-[28px] font-semibold tracking-tight text-[var(--budget-secondary)]">
          Historique
        </h1>
      </header>

      {entries.length === 0 ? (
        <section className="flex flex-col items-center gap-4 rounded-[16px] border border-[var(--budget-border)] bg-[var(--budget-surface)] p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--budget-border)] bg-[var(--budget-bg)]">
            <HistoryIcon className="h-6 w-6 text-[var(--budget-muted)]" />
          </div>
          <p className="text-[14px] text-[var(--budget-muted)]">
            Votre historique apparaîtra après votre premier budget.
          </p>
          <Link
            href="/budget/mois"
            className="flex h-11 items-center rounded-xl bg-[var(--budget-primary)] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--budget-primary-dark)]"
          >
            Créer un budget
          </Link>
        </section>
      ) : (
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
          {completeEntries.length > 0 && (
            <section className="flex flex-col gap-4 rounded-[16px] border border-[var(--budget-border)] bg-[var(--budget-surface)] p-5">
              <h2 className="budget-heading text-[18px] font-medium text-[var(--budget-secondary)]">
                Vue d&apos;ensemble
              </h2>
              <div className="flex items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[12px] text-[var(--budget-muted)]">
                    Moyenne mensuelle
                  </span>
                  <span className="budget-tabular budget-heading text-[24px] font-semibold leading-none text-[var(--budget-secondary)]">
                    {formatTnd(average).replace(" TND", "")}
                    <span className="ml-1 font-sans text-[13px] font-medium text-[var(--budget-muted)]">
                      TND
                    </span>
                  </span>
                  <span className="text-[12px] text-[var(--budget-muted)]">
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
                        className={`w-5 rounded-t ${
                          entry.status === "depasse"
                            ? "bg-[var(--budget-primary)]"
                            : "bg-[var(--budget-secondary)]/60"
                        }`}
                        style={{
                          height: `${Math.max(12, Math.round((entry.spent / maxSpent) * 100))}%`,
                        }}
                      />
                      <span className="text-[9px] text-[var(--budget-muted)]">
                        {formatMonthShortLabel(entry.month)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
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
                  className="group flex flex-col gap-3 rounded-[16px] border border-[var(--budget-border)] bg-[var(--budget-surface)] p-5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="budget-heading text-[16px] font-medium">
                      {formatMonthLabel(entry.month)}
                    </span>
                    <div className="flex items-center gap-1">
                      <HistoryBadge entry={entry} isCurrent={isCurrent(entry)} />
                      <ChevronRightIcon className="h-4 w-4 text-[var(--budget-muted)] transition-colors group-hover:text-[var(--budget-text)]" />
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="budget-tabular text-[15px] font-medium">
                      {formatTnd(entry.spent)}
                      <span className="text-[12px] font-normal text-[var(--budget-muted)]">
                        {" "}
                        / {formatTnd(entry.limit)}
                      </span>
                    </span>
                    <span className="budget-tabular text-[12px] font-medium text-[var(--budget-secondary)]">
                      {entry.percentUsed.toLocaleString("fr-FR")} %
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-[var(--budget-border)]"
                    role="progressbar"
                    aria-label={`Part du plafond utilisée en ${formatMonthLabel(entry.month)}`}
                    aria-valuenow={Math.round(entry.percentUsed)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${percentWidth}%`,
                        backgroundColor: progressColor(entry),
                      }}
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
