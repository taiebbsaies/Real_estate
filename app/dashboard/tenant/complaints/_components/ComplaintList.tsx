"use client";

import { useState } from "react";
import type { SerializedComplaint } from "@/lib/complaints/types";
import ComplaintForm from "./ComplaintForm";
import DeleteComplaintButton from "./DeleteComplaintButton";

// ─── Badge helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  pending: {
    label: "En attente",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  },
  in_progress: {
    label: "En cours",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  },
  resolved: {
    label: "Résolue",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
  },
  rejected: {
    label: "Rejetée",
    className:
      "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  },
};

const PRIORITY_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  low: {
    label: "Basse",
    className:
      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
  medium: {
    label: "Moyenne",
    className:
      "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400",
  },
  high: {
    label: "Haute",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400",
  },
  urgent: {
    label: "Urgente",
    className:
      "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
  },
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

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? { label: priority, className: "" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 py-16 text-center dark:border-zinc-800 dark:bg-zinc-900/30">
      <span className="text-4xl" aria-hidden="true">
        📋
      </span>
      <h3 className="mt-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        Aucune réclamation
      </h3>
      <p className="mt-1 text-xs text-zinc-500">
        Vous n&apos;avez pas encore soumis de réclamation.
      </p>
    </div>
  );
}

// ─── Complaint card ───────────────────────────────────────────────────────────

interface ComplaintCardProps {
  complaint: SerializedComplaint;
  onEdit: (c: SerializedComplaint) => void;
}

function ComplaintCard({ complaint, onEdit }: ComplaintCardProps) {
  const [expanded, setExpanded] = useState(false);
  const canEdit = complaint.status === "pending";

  return (
    <article className="linear-card rounded-2xl border border-zinc-200/90 bg-white/90 p-5 shadow-xs backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#111114]/90">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {CATEGORY_LABELS[complaint.category] ?? complaint.category}
          </p>
          <h3 className="mt-0.5 truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {complaint.title}
          </h3>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <StatusBadge status={complaint.status} />
          <PriorityBadge priority={complaint.priority} />
        </div>
      </div>

      {/* Description toggle */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        id={`expand-complaint-${complaint._id}`}
        className="mt-3 text-left text-xs text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-300"
        aria-expanded={expanded}
      >
        {expanded ? (
          complaint.description
        ) : (
          <span className="line-clamp-2">{complaint.description}</span>
        )}
        <span className="ml-1 font-semibold text-zinc-400">
          {expanded ? " Réduire ↑" : " Détails ↓"}
        </span>
      </button>

      {/* Resolution notes */}
      {expanded && complaint.resolutionNotes && (
        <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs text-emerald-800 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-300">
          <span className="font-semibold">Note de résolution : </span>
          {complaint.resolutionNotes}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800/80">
        <time
          dateTime={complaint.createdAt}
          className="text-[11px] text-zinc-400"
        >
          Date de création : {formatDate(complaint.createdAt)}
        </time>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              id={`edit-complaint-${complaint._id}`}
              onClick={() => onEdit(complaint)}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 bg-white/80 px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Modifier
            </button>
          )}
          {canEdit && <DeleteComplaintButton complaintId={complaint._id} />}
        </div>
      </div>
    </article>
  );
}

// ─── Props & filter ───────────────────────────────────────────────────────────

type StatusFilter = "all" | "pending" | "in_progress" | "resolved" | "rejected";

interface ComplaintListProps {
  complaints: SerializedComplaint[];
}

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "pending", label: "En attente" },
  { value: "in_progress", label: "En cours" },
  { value: "resolved", label: "Résolues" },
  { value: "rejected", label: "Rejetées" },
];

// ─── Main list ────────────────────────────────────────────────────────────────

export default function ComplaintList({ complaints }: ComplaintListProps) {
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [editTarget, setEditTarget] = useState<SerializedComplaint | null>(null);

  const filtered =
    filter === "all" ? complaints : complaints.filter((c) => c.status === filter);

  return (
    <div className="space-y-6">
      {/* Edit modal overlay */}
      {editTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Modifier la réclamation"
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg">
            <ComplaintForm
              editTarget={editTarget}
              onClose={() => setEditTarget(null)}
            />
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            id={`filter-${opt.value}`}
            onClick={() => setFilter(opt.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === opt.value
                ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
                : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
            }`}
          >
            {opt.label}
            {opt.value !== "all" && (
              <span className="ml-1.5 opacity-60">
                ({complaints.filter((c) => c.status === opt.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-4">
          {filtered.map((c) => (
            <li key={c._id}>
              <ComplaintCard complaint={c} onEdit={setEditTarget} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
