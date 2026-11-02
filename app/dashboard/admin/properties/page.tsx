import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { z } from "zod";
import {
  getModerationCounts,
  getOpenReportsByProperty,
  getPropertiesForModeration,
} from "@/lib/properties/admin-queries";
import { getSession } from "@/lib/session";
import ModerationCard from "./_components/ModerationCard";
import ReportModerationCard from "./_components/ReportModerationCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modération des logements — HomeCheck",
  description: "Examinez et modérez les annonces de logements.",
};

const statusSchema = z.enum(["pending", "approved", "rejected", "reports"]);
const statusTabs = [
  { value: "pending", label: "En attente" },
  { value: "approved", label: "Approuvés" },
  { value: "rejected", label: "Rejetés" },
  { value: "reports", label: "Signalements" },
] as const;

interface AdminPropertiesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminPropertiesPage({
  searchParams,
}: AdminPropertiesPageProps) {
  const session = await getSession();
  if (!session || session.activeRole !== "ADMIN") {
    redirect("/login");
  }

  const params = await searchParams;
  const rawStatus = params.status;
  const parsedStatus = statusSchema.safeParse(
    Array.isArray(rawStatus) ? rawStatus[0] : rawStatus,
  );
  const status = parsedStatus.success ? parsedStatus.data : "pending";

  const [counts, reportGroups, properties] = await Promise.all([
    getModerationCounts(),
    getOpenReportsByProperty(),
    status === "reports"
      ? Promise.resolve([])
      : getPropertiesForModeration(status),
  ]);
  const reportCountsByProperty = new Map(
    reportGroups.map((group) => [group.propertyId, group.reportCount]),
  );
  const propertiesWithReportCounts = properties.map((property) => ({
    ...property,
    reportCount: reportCountsByProperty.get(property._id) ?? property.reportCount,
  }));

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/75 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#08080a]/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
            >
              HomeCheck
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <Link
              href="/dashboard/admin"
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
            >
              Administration
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Logements
            </span>
          </div>
          <Link
            href="/profile"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Mon profil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-7">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Modération des logements
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Consultez les annonces et décidez de leur publication.
          </p>
        </div>

        <nav
          aria-label="Statut des annonces"
          className="mb-6 flex flex-wrap gap-2"
        >
          {statusTabs.map((tab) => {
            const isCurrent = status === tab.value;
            return (
              <Link
                key={tab.value}
                href={`/dashboard/admin/properties?status=${tab.value}`}
                aria-current={isCurrent ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  isCurrent
                    ? "border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    isCurrent
                      ? "bg-white/15 dark:bg-black/10"
                      : "bg-zinc-100 dark:bg-zinc-800"
                  }`}
                >
                  {counts[tab.value]}
                </span>
              </Link>
            );
          })}
        </nav>

        {status === "reports" ? (
          reportGroups.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <span className="text-4xl" aria-hidden="true">🛡️</span>
              <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Aucun signalement ouvert
              </h2>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Les nouveaux signalements apparaîtront ici.
              </p>
            </div>
          ) : (
            <ul className="space-y-5">
              {reportGroups.map((group) => (
                <li key={group.propertyId}>
                  <ReportModerationCard group={group} />
                </li>
              ))}
            </ul>
          )
        ) : propertiesWithReportCounts.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <span className="text-4xl" aria-hidden="true">🏘️</span>
            <h2 className="mt-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {status === "pending"
                ? "Aucun logement en attente"
                : status === "approved"
                  ? "Aucun logement approuvé"
                  : "Aucun logement rejeté"}
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Les annonces correspondant à ce statut apparaîtront ici.
            </p>
          </div>
        ) : (
          <ul className="space-y-5">
            {propertiesWithReportCounts.map((property) => (
              <li key={property._id}>
                <ModerationCard property={property} status={status} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
