import Link from "next/link";
import type { ComplaintStatistics } from "@/lib/complaints/statistics-queries";
import type { ComplaintStatus } from "@/lib/constants/complaint";
import { COMPLAINT_CATEGORY_LABELS } from "@/lib/constants/complaint";
import {
  buildOwnerComplaintsHref,
  formatResolutionDuration,
  STATISTICS_PERIODS,
  type StatisticsPeriod,
} from "@/lib/complaints/statistics";

type ComplaintStatisticsSectionProps = {
  statistics: ComplaintStatistics;
  period: StatisticsPeriod;
  activeStatus: ComplaintStatus | null;
};

const PERIOD_LABELS: Record<StatisticsPeriod, string> = {
  6: "6 derniers mois",
  12: "12 derniers mois",
};

function percent(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.max(4, Math.round((value / max) * 100));
}

export default function ComplaintStatisticsSection({
  statistics,
  period,
  activeStatus,
}: ComplaintStatisticsSectionProps) {
  const { allTime, period: periodStats } = statistics;

  const kpis = [
    {
      label: "Total",
      value: allTime.total,
      accent: "text-zinc-900 dark:text-zinc-50",
      bar: "bg-zinc-800 dark:bg-zinc-200",
      hint: "Toutes périodes",
    },
    {
      label: "En attente",
      value: allTime.pending,
      accent: "text-amber-600 dark:text-amber-400",
      bar: "bg-amber-500",
      hint: "À traiter",
    },
    {
      label: "En cours",
      value: allTime.in_progress,
      accent: "text-blue-600 dark:text-blue-400",
      bar: "bg-blue-500",
      hint: "Prises en charge",
    },
    {
      label: "Résolues",
      value: allTime.resolved,
      accent: "text-emerald-600 dark:text-emerald-400",
      bar: "bg-emerald-500",
      hint: "Clôturées",
    },
    {
      label: "Rejetées",
      value: allTime.rejected,
      accent: "text-red-600 dark:text-red-400",
      bar: "bg-red-500",
      hint: "Non retenues",
    },
    {
      label: "Urgentes",
      value: allTime.urgent,
      accent: "text-orange-600 dark:text-orange-400",
      bar: "bg-orange-500",
      hint: "Priorité urgente",
    },
  ];

  const maxCategoryCount = Math.max(
    1,
    ...periodStats.categories.map((category) => category.count),
  );
  const maxMonthlyCount = Math.max(
    1,
    ...periodStats.monthly.map((month) => month.count),
  );
  const averageResolution = formatResolutionDuration(
    periodStats.resolution.averageMs,
  );

  return (
    <section
      aria-labelledby="complaint-statistics-heading"
      className="mb-10 space-y-4"
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Tableau de bord
            </p>
            <h2
              id="complaint-statistics-heading"
              className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50"
            >
              Statistiques des réclamations
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
              Vue d&apos;ensemble de toutes les réclamations, puis analyse des
              réclamations créées sur les {PERIOD_LABELS[period]}.
            </p>
          </div>

          <nav aria-label="Période d'analyse" className="flex flex-wrap gap-2">
            {STATISTICS_PERIODS.map((option) => {
              const isActive = option === period;
              return (
                <Link
                  key={option}
                  href={buildOwnerComplaintsHref({
                    status: activeStatus,
                    period: option,
                  })}
                  aria-current={isActive ? "page" : undefined}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm dark:bg-blue-500"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {PERIOD_LABELS[option]}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            Vue d&apos;ensemble
          </h3>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            Toutes périodes
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950/40"
            >
              <span
                aria-hidden="true"
                className={`absolute inset-x-0 top-0 h-0.5 ${kpi.bar}`}
              />
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {kpi.label}
              </dt>
              <dd
                className={`mt-1.5 text-2xl font-bold tabular-nums ${kpi.accent}`}
              >
                {kpi.value}
              </dd>
              <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                {kpi.hint}
              </p>
            </div>
          ))}
        </dl>

        {allTime.total === 0 && (
          <p className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/40 dark:text-zinc-400">
            Aucune réclamation enregistrée pour le moment. Les statistiques
            apparaîtront dès la première soumission.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          Analyse sur la période
        </h3>
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
          {PERIOD_LABELS[period]}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Catégories les plus fréquentes
              </h3>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Réclamations créées sur la période, de la plus fréquente à la
                moins fréquente.
              </p>
            </div>
            <span className="shrink-0 rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {periodStats.total} au total
            </span>
          </div>

          {periodStats.total === 0 && (
            <p className="mt-4 rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              Aucune réclamation créée sur cette période.
            </p>
          )}

          <ul
            aria-label="Réclamations par catégorie sur la période sélectionnée"
            className="mt-4 space-y-3"
          >
            {periodStats.categories.map(({ category, count }) => (
              <li key={category}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {COMPLAINT_CATEGORY_LABELS[category]}
                  </span>
                  <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {count}
                    <span className="sr-only"> réclamation(s)</span>
                  </span>
                </div>
                <div
                  aria-hidden="true"
                  className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
                >
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all dark:bg-blue-400"
                    style={{ width: `${percent(count, maxCategoryCount)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              Temps moyen de résolution
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Réclamations résolues sur la période sélectionnée.
            </p>

            {averageResolution ? (
              <>
                <p className="mt-4 text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {averageResolution}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Moyenne calculée sur{" "}
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                    {periodStats.resolution.sampleSize}
                  </span>{" "}
                  réclamation
                  {periodStats.resolution.sampleSize > 1 ? "s" : ""} résolue
                  {periodStats.resolution.sampleSize > 1 ? "s" : ""} avec un
                  horodatage valide.
                </p>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-zinc-300 px-4 py-5 dark:border-zinc-700">
                <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                  Aucune donnée disponible
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Aucune réclamation résolue avec un horodatage de résolution
                  valide sur cette période. Le suivi démarre à la première
                  résolution enregistrée ; les anciennes résolutions ne sont pas
                  reconstituées.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              Volume de la période
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Nombre de réclamations créées du{" "}
              {new Date(periodStats.start).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}{" "}
              à aujourd&apos;hui.
            </p>
            <p className="mt-4 text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
              {periodStats.total}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
              Réclamations créées par mois
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Les mois sans réclamation restent affichés avec une valeur de 0.
            </p>
          </div>
          <span className="rounded-lg bg-zinc-100 px-2 py-1 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {periodStats.monthly.length} mois
          </span>
        </div>

        <ul
          aria-label="Réclamations créées par mois sur la période sélectionnée"
          className="mt-4 space-y-2.5"
        >
          {periodStats.monthly.map((month) => (
            <li key={month.key}>
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="font-medium capitalize text-zinc-700 dark:text-zinc-300">
                  {month.label}
                </span>
                <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {month.count}
                  <span className="sr-only"> réclamation(s)</span>
                </span>
              </div>
              <div
                aria-hidden="true"
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
              >
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all dark:bg-indigo-400"
                  style={{ width: `${percent(month.count, maxMonthlyCount)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
