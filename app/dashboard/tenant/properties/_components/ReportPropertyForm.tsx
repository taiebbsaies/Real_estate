"use client";

import { useActionState, useState } from "react";
import {
  reportProperty,
  type ReportActionState,
} from "@/app/actions/reports";
import {
  reportReasonLabels,
  reportReasons,
} from "@/lib/validations/report";

interface ReportPropertyFormProps {
  propertyId: string;
}

const initialState: ReportActionState = {
  success: false,
  message: "",
};

export default function ReportPropertyForm({
  propertyId,
}: ReportPropertyFormProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reportReasons)[number]>(
    reportReasons[0],
  );
  const [state, formAction, pending] = useActionState(
    reportProperty,
    initialState,
  );

  return (
    <section className="mt-5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="text-sm font-semibold text-zinc-600 underline decoration-zinc-300 underline-offset-4 transition hover:text-red-700 dark:text-zinc-400 dark:decoration-zinc-700 dark:hover:text-red-400"
      >
        Signaler cette annonce
      </button>

      {open && !state.success && (
        <form
          action={formAction}
          className="mt-4 max-w-xl space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60"
        >
          <input type="hidden" name="propertyId" value={propertyId} />
          <div>
            <label
              htmlFor={`report-reason-${propertyId}`}
              className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Motif du signalement
            </label>
            <select
              id={`report-reason-${propertyId}`}
              name="reason"
              value={reason}
              onChange={(event) =>
                setReason(event.target.value as (typeof reportReasons)[number])
              }
              required
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {reportReasons.map((value) => (
                <option key={value} value={value}>
                  {reportReasonLabels[value]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`report-comment-${propertyId}`}
              className="mb-1.5 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Commentaire {reason === "other" ? "(obligatoire)" : "(facultatif)"}
            </label>
            <textarea
              id={`report-comment-${propertyId}`}
              name="comment"
              required={reason === "other"}
              minLength={reason === "other" ? 10 : undefined}
              maxLength={500}
              rows={3}
              placeholder="Ajoutez des précisions (10 à 500 caractères)."
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          {state.message && (
            <p
              role="alert"
              className="text-sm text-red-700 dark:text-red-400"
            >
              {state.message}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 items-center rounded-xl border border-zinc-200 px-4 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-9 items-center rounded-xl bg-red-700 px-4 text-xs font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-red-600 dark:hover:bg-red-500"
            >
              {pending ? "Envoi…" : "Envoyer le signalement"}
            </button>
          </div>
        </form>
      )}

      {state.success && (
        <p
          role="status"
          className="mt-3 text-sm text-emerald-700 dark:text-emerald-400"
        >
          {state.message}
        </p>
      )}
    </section>
  );
}
