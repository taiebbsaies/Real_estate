"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateComplaintClassification } from "@/app/actions/complaints";
import type { SerializedComplaint } from "@/lib/complaints/types";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_CATEGORY_LABELS,
  COMPLAINT_PRIORITIES,
  COMPLAINT_PRIORITY_LABELS,
  type ComplaintCategory,
  type ComplaintPriority,
} from "@/lib/constants/complaint";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800 active:scale-95 disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
    >
      {pending ? "Enregistrement…" : "Valider la classification"}
    </button>
  );
}

interface ComplaintClassificationPanelProps {
  complaint: SerializedComplaint;
}

/**
 * Staff-facing view of the automatic classification, with an explicit
 * correction form for authorised roles. The server action re-checks the role
 * and complaint visibility, so hiding this form is never the only safeguard.
 */
export default function ComplaintClassificationPanel({
  complaint,
}: ComplaintClassificationPanelProps) {
  const [state, formAction] = useActionState(
    updateComplaintClassification,
    null,
  );

  const needsReview = complaint.classificationStatus === "needs_review";
  const correctedByStaff = complaint.classificationSource === "staff";
  const classifiedByAi = complaint.classificationSource === "ai";

  // Legacy complaints were classified manually before automatic
  // classification existed. They must never be presented as an AI result.
  const statusLabel = needsReview
    ? "Classification à vérifier"
    : correctedByStaff
      ? "Corrigée par l'équipe"
      : classifiedByAi
        ? "Classification IA terminée"
        : "Classification existante";

  const statusClassName = needsReview
    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
    : correctedByStaff
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
      : classifiedByAi
        ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <section
      aria-labelledby={`classification-${complaint._id}`}
      className={`mt-4 rounded-xl border p-4 ${
        needsReview
          ? "border-amber-200 bg-amber-50/60 dark:border-amber-800/50 dark:bg-amber-950/20"
          : "border-blue-100 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id={`classification-${complaint._id}`}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300"
        >
          <span aria-hidden="true">✨</span>
          Classification
        </h3>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusClassName}`}
        >
          {statusLabel}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/70 bg-white/80 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/80">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Catégorie
          </dt>
          <dd className="mt-0.5 break-words text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {COMPLAINT_CATEGORY_LABELS[complaint.category] ?? complaint.category}
          </dd>
        </div>
        <div className="rounded-lg border border-white/70 bg-white/80 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/80">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Priorité
          </dt>
          <dd className="mt-0.5 break-words text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {COMPLAINT_PRIORITY_LABELS[complaint.priority] ?? complaint.priority}
          </dd>
        </div>
      </dl>

      {needsReview ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300">
          L&apos;IA n&apos;a pas pu analyser cette réclamation de façon fiable.
          Une catégorie et une priorité par défaut ont été appliquées. Vérifiez
          et corrigez la classification ci-dessous.
        </p>
      ) : (
        <div className="mt-3 space-y-2 text-xs leading-relaxed">
          {complaint.aiExplanation && (
            <div className="rounded-lg border border-white/70 bg-white/80 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/80">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Pourquoi cette priorité ?
              </p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                {complaint.aiExplanation}
              </p>
            </div>
          )}
          {complaint.recommendedAction && (
            <div className="rounded-lg border border-white/70 bg-white/80 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/80">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Intervention recommandée
              </p>
              <p className="mt-1 text-zinc-700 dark:text-zinc-300">
                {complaint.recommendedAction}
              </p>
            </div>
          )}
          {correctedByStaff && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
              Classification validée ou corrigée par un membre de l&apos;équipe.
            </p>
          )}
        </div>
      )}

      <details className="group mt-3">
        <summary className="cursor-pointer text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          Corriger la classification
        </summary>

        <form action={formAction} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={complaint._id} />

          {state && (
            <p
              role="alert"
              className={`rounded-lg px-3 py-2 text-xs font-medium ${
                state.success
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
              }`}
            >
              {state.message}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor={`classification-category-${complaint._id}`}
                className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Catégorie
              </label>
              <select
                id={`classification-category-${complaint._id}`}
                name="category"
                defaultValue={complaint.category}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {COMPLAINT_CATEGORIES.map((category: ComplaintCategory) => (
                  <option key={category} value={category}>
                    {COMPLAINT_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
              {state?.errors?.category?.[0] && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                  {state.errors.category[0]}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`classification-priority-${complaint._id}`}
                className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
              >
                Priorité
              </label>
              <select
                id={`classification-priority-${complaint._id}`}
                name="priority"
                defaultValue={complaint.priority}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {COMPLAINT_PRIORITIES.map((priority: ComplaintPriority) => (
                  <option key={priority} value={priority}>
                    {COMPLAINT_PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>
              {state?.errors?.priority?.[0] && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                  {state.errors.priority[0]}
                </p>
              )}
            </div>
          </div>

          <p className="text-[11px] text-zinc-400">
            Cette correction est réservée à l&apos;équipe et remplace
            l&apos;explication générée par l&apos;IA.
          </p>

          <SaveButton />
        </form>
      </details>
    </section>
  );
}
