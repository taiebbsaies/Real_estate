import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getMyComplaints } from "@/lib/complaints/queries";
import ComplaintForm from "./_components/ComplaintForm";
import ComplaintList from "./_components/ComplaintList";
import OfflineBanner from "./_components/OfflineBanner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mes Réclamations | HomeCheck",
  description: "Gérez vos réclamations de logement.",
};

export default async function TenantComplaintsPage() {
  const session = await getSession();

  if (!session || (session.activeRole !== "TENANT" && session.activeRole !== "ADMIN")) {
    redirect("/login");
  }

  const complaints = await getMyComplaints();

  // KPI counts
  const total = complaints.length;
  const pending = complaints.filter((c) => c.status === "pending").length;
  const inProgress = complaints.filter((c) => c.status === "in_progress").length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;

  return (
    <div className="relative min-h-full linear-grid bg-[var(--background)] text-[var(--foreground)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/75 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#08080a]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950 text-xs font-bold text-white shadow-xs dark:bg-white dark:text-zinc-950">
                H
              </div>
              <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                HomeCheck
              </span>
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <Link
              href="/dashboard/tenant"
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              Locataire
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              Réclamations
            </span>
          </div>
          <Link
            href="/profile"
            className="text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Paramètres
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Page heading */}
        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
              Gestion des réclamations
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Soumettez et suivez vos demandes d&apos;intervention pour votre logement.
            </p>
          </div>
          <Link
            href="/dashboard/tenant"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white/80 px-4 text-xs font-semibold text-zinc-700 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            ← Tableau de bord
          </Link>
        </div>

        {/* Offline banner */}
        <div className="mb-6">
          <OfflineBanner />
        </div>

        {/* KPI cards */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total", value: total, color: "text-zinc-900 dark:text-zinc-50", dot: "bg-zinc-400" },
            { label: "En attente", value: pending, color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-400 animate-pulse" },
            { label: "En cours", value: inProgress, color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500 animate-pulse" },
            { label: "Résolues", value: resolved, color: "text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
          ].map(({ label, value, color, dot }) => (
            <div
              key={label}
              className="linear-card rounded-2xl border border-zinc-200/90 bg-white/90 p-5 shadow-xs backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#111114]/90"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  {label}
                </span>
                <span className={`h-2 w-2 rounded-full ${dot}`} />
              </div>
              <p className={`mt-3 text-3xl font-extrabold tracking-tight ${color}`}>
                {value}
              </p>
              <p className="mt-1 text-xs text-zinc-500">réclamation{value !== 1 ? "s" : ""}</p>
            </div>
          ))}
        </div>

        {/* Two-column layout: form left, list right (stacked on mobile) */}
        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          {/* New complaint form */}
          <section aria-label="Nouvelle réclamation">
            <ComplaintForm />
          </section>

          {/* Complaint list */}
          <section aria-label="Mes réclamations">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                Mes réclamations
              </h2>
              <span className="text-xs text-zinc-400">{total} au total</span>
            </div>
            <ComplaintList complaints={complaints} />
          </section>
        </div>
      </main>
    </div>
  );
}
