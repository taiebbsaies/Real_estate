import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  getModerationCounts,
  type ModerationCounts,
} from "@/lib/properties/admin-queries";
import { getSession } from "@/lib/session";
import AdminHeader from "./_components/AdminHeader";
import { ADMIN_MODULES, type AdminModule } from "./_components/adminModules";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tableau de bord administrateur — HomeCheck",
  description:
    "Pilotez les modules de HomeCheck : logements, réclamations et budget.",
};

function ModuleIcon({
  icon,
  className = "h-5 w-5",
}: {
  icon: AdminModule["icon"];
  className?: string;
}) {
  const paths: Record<AdminModule["icon"], ReactNode> = {
    house: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9 21v-6h6v6" />
      </>
    ),
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    wallet: (
      <>
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
      </>
    ),
    chat: (
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    ),
    users: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
  };

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[icon]}
    </svg>
  );
}

function AdminModuleCard({
  module,
  counts,
}: {
  module: AdminModule;
  counts: ModerationCounts | null;
}) {
  const isLogements = module.key === "logements";
  const pendingCount = counts?.pending ?? 0;
  const reportsCount = counts?.reports ?? 0;

  const iconWrapperClass =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#DCFCE7] text-[#166534] dark:bg-emerald-500/15 dark:text-emerald-400";

  const cardClass =
    "flex h-full min-w-0 flex-col rounded-2xl border border-[#DCFCE7] bg-white/90 p-6 shadow-sm shadow-[#166534]/5 backdrop-blur-md dark:border-emerald-500/15 dark:bg-[#0c1410]/80";

  return (
    <article className={cardClass}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className={iconWrapperClass}>
          <ModuleIcon icon={module.icon} />
        </div>
        {isLogements && (pendingCount > 0 || reportsCount > 0) && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Action requise
          </span>
        )}
      </div>

      <h2 className="mt-4 break-words text-lg font-bold text-[#1F2937] dark:text-zinc-50">
        {module.title}
      </h2>
      <p className="mt-1 break-words text-sm text-[#6B7280] dark:text-zinc-400">
        {module.description}
      </p>

      {isLogements && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div
              className={`min-w-0 rounded-xl border px-3 py-2.5 ${
                pendingCount > 0
                  ? "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30"
                  : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60"
              }`}
            >
              <p className="break-words text-xs font-medium text-zinc-500 dark:text-zinc-400">
                En attente
              </p>
              <p
                className={`mt-1 text-2xl font-extrabold ${
                  pendingCount > 0
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-zinc-900 dark:text-zinc-50"
                }`}
              >
                {counts?.pending ?? "—"}
              </p>
            </div>
            <div
              className={`min-w-0 rounded-xl border px-3 py-2.5 ${
                (counts?.approved ?? 0) > 0
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30"
                  : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60"
              }`}
            >
              <p className="break-words text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Approuvés
              </p>
              <p
                className={`mt-1 text-2xl font-extrabold ${
                  (counts?.approved ?? 0) > 0
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-zinc-900 dark:text-zinc-50"
                }`}
              >
                {counts?.approved ?? "—"}
              </p>
            </div>
            <div
              className={`min-w-0 rounded-xl border px-3 py-2.5 ${
                (counts?.rejected ?? 0) > 0
                  ? "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30"
                  : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60"
              }`}
            >
              <p className="break-words text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Rejetés
              </p>
              <p
                className={`mt-1 text-2xl font-extrabold ${
                  (counts?.rejected ?? 0) > 0
                    ? "text-red-700 dark:text-red-300"
                    : "text-zinc-900 dark:text-zinc-50"
                }`}
              >
                {counts?.rejected ?? "—"}
              </p>
            </div>
            <div
              className={`min-w-0 rounded-xl border px-3 py-2.5 ${
                reportsCount > 0
                  ? "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30"
                  : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/60"
              }`}
            >
              <p className="break-words text-xs font-medium text-zinc-500 dark:text-zinc-400">
                Signalements
              </p>
              <p
                className={`mt-1 text-2xl font-extrabold ${
                  reportsCount > 0
                    ? "text-red-700 dark:text-red-300"
                    : "text-zinc-900 dark:text-zinc-50"
                }`}
              >
                {counts?.reports ?? "—"}
              </p>
            </div>
          </div>
        </>
      )}

        {isLogements && (
          <div className="mt-auto flex flex-wrap gap-2 pt-6">
            <Link
              href="/dashboard/admin/properties"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#166534] px-5 text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#14532d] active:scale-98 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 dark:shadow-[0_0_20px_-3px_rgba(34,197,94,0.4)] sm:w-auto"
            >
              Consulter les logements
            </Link>
            <Link
              href="/dashboard/admin/properties?status=pending"
              className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:flex-none"
            >
              En attente ({counts?.pending ?? "—"})
            </Link>
            <Link
              href="/dashboard/admin/properties?status=reports"
              className="inline-flex h-9 flex-1 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 sm:flex-none"
            >
              Signalements ({counts?.reports ?? "—"})
            </Link>
          </div>
        )}

        {!isLogements &&
          (module.href ? (
            <div className="mt-auto pt-6">
              <Link
                href={module.href}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-[#DCFCE7] bg-white px-5 text-xs font-semibold text-[#166534] transition-all hover:bg-[#F0FDF4] dark:border-emerald-500/20 dark:bg-[#0c1410] dark:text-emerald-300 dark:hover:bg-[#121c16]"
              >
                Ouvrir le module
              </Link>
            </div>
          ) : (
            <div className="mt-auto pt-6">
              <span className="inline-flex h-10 items-center justify-center rounded-xl border border-dashed border-zinc-300 px-5 text-xs font-semibold text-zinc-400 dark:border-zinc-700 dark:text-zinc-500">
                Bientôt disponible
              </span>
            </div>
          ))}
    </article>
  );
}

export default async function AdminDashboardPage() {
  const session = await getSession();

  if (!session || session.activeRole !== "ADMIN") {
    redirect("/login");
  }

  let counts: ModerationCounts | null = null;

  try {
    counts = await getModerationCounts();
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.name : "UnknownError");
  }

  return (
    <div className="relative min-h-full bg-zinc-50 dark:bg-zinc-950">
      <AdminHeader active="dashboard" />

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
            Tableau de bord administrateur
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Bonjour, {session.firstName} 👋 Pilotez les modules de HomeCheck.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {ADMIN_MODULES.map((module) => (
            <AdminModuleCard key={module.key} module={module} counts={counts} />
          ))}
        </div>
      </main>
    </div>
  );
}
