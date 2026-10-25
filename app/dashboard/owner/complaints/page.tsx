import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSession } from "@/lib/session";
import { getAllComplaints } from "@/lib/complaints/queries";
import StatusUpdateForm from "./_components/StatusUpdateForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Réclamations — Propriétaire | HomeCheck",
};

const CATEGORY_LABELS: Record<string, string> = {
  plumbing: "Plomberie",
  electricity: "Électricité",
  heating: "Chauffage",
  structural: "Dommages structurels",
  noise: "Nuisances sonores",
  common_areas: "Parties communes",
  other: "Autre",
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400" },
  in_progress: { label: "En cours", className: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" },
  resolved: { label: "Résolue", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400" },
  rejected: { label: "Rejetée", className: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400" },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low: { label: "Basse", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  medium: { label: "Moyenne", className: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400" },
  high: { label: "Haute", className: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400" },
  urgent: { label: "Urgente", className: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export default async function OwnerComplaintsPage() {
  const session = await getSession();

  if (!session || (session.activeRole !== "OWNER" && session.activeRole !== "ADMIN")) {
    redirect("/login");
  }

  const complaints = await getAllComplaints();

  const pending = complaints.filter((c) => c.status === "pending").length;
  const inProgress = complaints.filter((c) => c.status === "in_progress").length;
  const resolved = complaints.filter((c) => c.status === "resolved").length;

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold tracking-tight text-blue-600 dark:text-blue-400">
              HomeCheck
            </Link>
            <span className="text-zinc-400">/</span>
            <Link href="/dashboard/owner" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300">
              Propriétaire
            </Link>
            <span className="text-zinc-400">/</span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Réclamations</span>
          </div>
          <Link href="/profile" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
            Mon Profil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Gestion des réclamations 📋
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Consultez et traitez toutes les réclamations soumises par les locataires.
          </p>
        </div>

        {/* KPI cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { label: "En attente", value: pending, color: "text-amber-600 dark:text-amber-400" },
            { label: "En cours", value: inProgress, color: "text-blue-600 dark:text-blue-400" },
            { label: "Résolues", value: resolved, color: "text-emerald-600 dark:text-emerald-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
              <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Complaint list */}
        {complaints.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-white py-16 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-3xl">📭</span>
            <p className="mt-3 text-sm font-semibold text-zinc-600 dark:text-zinc-400">Aucune réclamation pour le moment.</p>
          </div>
        ) : (
          <ul className="space-y-5">
            {complaints.map((complaint) => {
              const statusCfg = STATUS_CONFIG[complaint.status] ?? { label: complaint.status, className: "" };
              const priorityCfg = PRIORITY_CONFIG[complaint.priority] ?? { label: complaint.priority, className: "" };
              return (
                <li key={complaint._id}>
                  <article className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                          {CATEGORY_LABELS[complaint.category] ?? complaint.category}
                        </p>
                        <h2 className="mt-0.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {complaint.title}
                        </h2>
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          Soumise le {formatDate(complaint.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.className}`}>
                          {statusCfg.label}
                        </span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${priorityCfg.className}`}>
                          {priorityCfg.label}
                        </span>
                      </div>
                    </div>

                    <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3">
                      {complaint.description}
                    </p>

                    {complaint.resolutionNotes && (
                      <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <span className="font-semibold">Note : </span>
                        {complaint.resolutionNotes}
                      </div>
                    )}

                    {/* Status update form */}
                    <div className="mt-5 border-t border-zinc-100 pt-5 dark:border-zinc-800">
                      <p className="mb-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                        Mettre à jour le statut
                      </p>
                      <StatusUpdateForm complaint={complaint} />
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
