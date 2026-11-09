"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  dismissReports,
  rejectProperty,
  type ModerationActionResult,
} from "@/app/actions/moderation";
import {
  reportReasonLabels,
} from "@/lib/validations/report";
import type { OpenReportGroup } from "@/lib/properties/admin-queries";

interface ReportModerationCardProps {
  group: OpenReportGroup;
}

export default function ReportModerationCard({
  group,
}: ReportModerationCardProps) {
  const router = useRouter();
  const [rejectFormOpen, setRejectFormOpen] = useState(false);
  const [result, setResult] = useState<ModerationActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [resolved, setResolved] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  function handleDismiss() {
    startTransition(async () => {
      try {
        const actionResult = await dismissReports(group.propertyId);
        setResult(actionResult);
        setResolved(actionResult.success);
        if (actionResult.success) router.refresh();
      } catch (error: unknown) {
        console.error(
          "[ReportModerationCard] dismiss action failed:",
          error instanceof Error ? error.name : "UnknownError",
        );
        setResult({
          success: false,
          message: "Impossible de traiter les signalements. Veuillez réessayer.",
        });
      }
    });
  }

  function handleReject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const reason = formData.get("reason");
    if (typeof reason !== "string") {
      setResult({ success: false, message: "Veuillez saisir un motif." });
      return;
    }

    startTransition(async () => {
      try {
        const actionResult = await rejectProperty(group.propertyId, reason);
        setResult(actionResult);
        setResolved(actionResult.success);
        if (actionResult.success) {
          setRejectFormOpen(false);
          router.refresh();
        }
      } catch (error: unknown) {
        console.error(
          "[ReportModerationCard] reject action failed:",
          error instanceof Error ? error.name : "UnknownError",
        );
        setResult({
          success: false,
          message: "Impossible de modérer ce logement. Veuillez réessayer.",
        });
      }
    });
  }

  if (resolved) {
    return (
      <p
        role="status"
        className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-medium text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300"
      >
        {result?.message}
      </p>
    );
  }

  return (
    <article className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-6">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-base font-bold text-zinc-950 dark:text-zinc-50">
            {group.propertyTitle}
          </h2>
          <p className="mt-1 break-words text-sm text-zinc-500 dark:text-zinc-400">
            {group.city}
            {group.zone ? ` · ${group.zone}` : ""}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 dark:bg-red-950/50 dark:text-red-300">
          {group.reportCount} signalement{group.reportCount > 1 ? "s" : ""}
        </span>
      </div>

      <ul className="mt-4 space-y-3">
        {group.reports.map((report) => (
          <li
            key={report._id}
            className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {reportReasonLabels[report.reason]}
              </p>
              <time
                dateTime={report.createdAt}
                className="text-xs text-zinc-500 dark:text-zinc-400"
              >
                {new Date(report.createdAt).toLocaleString("fr-FR")}
              </time>
            </div>
            {report.comment && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-zinc-700 dark:text-zinc-300">
                {report.comment}
              </p>
            )}
            <p className="mt-2 break-words text-xs text-zinc-500 dark:text-zinc-400">
              Signalé par {report.reporterEmail}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <button
          type="button"
          onClick={handleDismiss}
          disabled={pending}
          className="inline-flex h-9 items-center rounded-xl border border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Classer sans suite
        </button>
        {group.moderationStatus !== "rejected" && (
          <button
            type="button"
            onClick={() => setRejectFormOpen((open) => !open)}
            disabled={pending}
            className="inline-flex h-9 items-center rounded-xl bg-red-700 px-4 text-xs font-semibold text-white transition hover:bg-red-800 disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
          >
            {group.moderationStatus === "approved"
              ? "Retirer de la publication"
              : "Rejeter le logement"}
          </button>
        )}
      </div>

      {rejectFormOpen && group.moderationStatus !== "rejected" && (
        <form onSubmit={handleReject} className="mt-4 space-y-2">
          <label
            htmlFor={`report-rejection-${group.propertyId}`}
            className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
          >
            Motif du rejet
          </label>
          <textarea
            id={`report-rejection-${group.propertyId}`}
            name="reason"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            required
            minLength={10}
            maxLength={1000}
            rows={3}
            aria-describedby={`report-rejection-count-${group.propertyId}`}
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <p
            id={`report-rejection-count-${group.propertyId}`}
            className="text-right text-[10px] text-zinc-400"
          >
            {rejectReason.trim().length}/1000 caractères (10 minimum)
          </p>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-9 items-center rounded-xl bg-red-700 px-4 text-xs font-semibold text-white transition hover:bg-red-800 disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
            >
              {pending ? "Traitement…" : "Confirmer le rejet"}
            </button>
          </div>
        </form>
      )}

      {result && !result.success && (
        <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
          {result.message}
        </p>
      )}
    </article>
  );
}
