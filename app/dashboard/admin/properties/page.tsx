import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  getModerationCounts,
  getOpenReportsByProperty,
  getPropertiesForModeration,
  type ModerationCounts,
} from "@/lib/properties/admin-queries";
import { getSession } from "@/lib/session";
import { computePriceInsights } from "@/lib/properties/price-insight";
import { parseAdminModerationQuery } from "@/lib/validations/property-search";
import AdminHeader from "../_components/AdminHeader";
import ModerationCard from "./_components/ModerationCard";
import ReportModerationCard from "./_components/ReportModerationCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Modération des logements — HomeCheck",
  description: "Examinez et modérez les annonces de logements.",
};

const MODERATION_PAGE_SIZE = 12;

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
  const rawPage = params.page;
  const statusValue = Array.isArray(rawStatus) ? rawStatus[0] : rawStatus;
  const pageValue = Array.isArray(rawPage) ? rawPage[0] : rawPage;
  const { status, page: requestedPage } = parseAdminModerationQuery({
    status: statusValue,
    page: pageValue,
  });

  let counts: ModerationCounts | null = null;

  try {
    counts = await getModerationCounts();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.name : "UnknownError");
  }

  const sortDirection = status === "pending" ? "asc" : "desc";
  const reportGroups = await getOpenReportsByProperty();
  const properties =
    status === "reports"
      ? []
      : await getPropertiesForModeration(status, sortDirection);

  const reportCountsByProperty = new Map(
    reportGroups.map((group) => [group.propertyId, group.reportCount]),
  );
  const reportsByPropertyId = new Map(
    reportGroups.map((group) => [group.propertyId, group.reports]),
  );
  const propertiesWithReportCounts = properties.map((property) => ({
    ...property,
    reportCount: reportCountsByProperty.get(property._id) ?? property.reportCount,
  }));
  const priceInsights = await computePriceInsights(
    propertiesWithReportCounts.map((property) => ({
      id: property._id,
      city: property.city,
      type: property.type,
      price: property.price,
      surface: property.surface,
    })),
  );

  const totalPages = Math.max(
    1,
    Math.ceil(propertiesWithReportCounts.length / MODERATION_PAGE_SIZE),
  );
  const reportTotalPages = Math.max(
    1,
    Math.ceil(reportGroups.length / MODERATION_PAGE_SIZE),
  );
  const page = Math.min(
    requestedPage,
    status === "reports" ? reportTotalPages : totalPages,
  );
  const startIndex = (page - 1) * MODERATION_PAGE_SIZE;
  const paginatedProperties = propertiesWithReportCounts.slice(
    startIndex,
    startIndex + MODERATION_PAGE_SIZE,
  );
  const paginatedReportGroups = reportGroups.slice(
    startIndex,
    startIndex + MODERATION_PAGE_SIZE,
  );
  const hasNextPage =
    startIndex + MODERATION_PAGE_SIZE < propertiesWithReportCounts.length;
  const hasNextReportPage =
    startIndex + MODERATION_PAGE_SIZE < reportGroups.length;

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <AdminHeader active="properties" />

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Tableau de bord
        </Link>

        <div className="mt-4 mb-7">
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
                href={`/dashboard/admin/properties?status=${tab.value}${
                  tab.value === "pending" ? "" : `&page=1`
                }`}
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
                  {tab.value === "reports"
                    ? (counts?.reports ?? "—")
                    : tab.value === "pending"
                      ? (counts?.pending ?? "—")
                      : tab.value === "approved"
                        ? (counts?.approved ?? "—")
                        : (counts?.rejected ?? "—")}
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
              {paginatedReportGroups.map((group) => (
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
          <>
            <ul className="space-y-5">
              {paginatedProperties.map((property) => (
                <li key={property._id}>
                  <ModerationCard
                    property={property}
                    status={status}
                    reports={reportsByPropertyId.get(property._id)}
                    priceInsight={priceInsights[property._id] ?? null}
                  />
                </li>
              ))}
            </ul>

            <nav
              aria-label="Pagination des annonces"
              className="mt-8 flex items-center justify-between"
            >
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Page {page}
              </p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/dashboard/admin/properties?status=${status}&page=${
                      page - 1
                    }`}
                    className="inline-flex h-9 items-center rounded-xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Précédent
                  </Link>
                )}

                {hasNextPage && (
                  <Link
                    href={`/dashboard/admin/properties?status=${status}&page=${
                      page + 1
                    }`}
                    className="inline-flex h-9 items-center rounded-xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Suivant
                  </Link>
                )}
              </div>
            </nav>
          </>
        )}

        {status === "reports" && reportGroups.length > MODERATION_PAGE_SIZE && (
          <nav
            aria-label="Pagination des signalements"
            className="mt-8 flex items-center justify-between"
          >
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Page {page} sur {reportTotalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/dashboard/admin/properties?status=reports&page=${page - 1}`}
                  className="inline-flex h-9 items-center rounded-xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Précédent
                </Link>
              )}
              {hasNextReportPage && (
                <Link
                  href={`/dashboard/admin/properties?status=reports&page=${page + 1}`}
                  className="inline-flex h-9 items-center rounded-xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Suivant
                </Link>
              )}
            </div>
          </nav>
        )}
      </main>
    </div>
  );
}
