"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateComplaintStatus } from "@/app/actions/complaints";
import type { SerializedComplaint } from "@/lib/complaints/types";

const STATUS_OPTIONS = [
  { value: "pending", label: "En attente" },
  { value: "in_progress", label: "En cours" },
  { value: "resolved", label: "Résolue" },
  { value: "rejected", label: "Rejetée" },
];

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-4 text-xs font-semibold text-white transition hover:bg-zinc-800 active:scale-95 disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
    >
      {pending ? "Enregistrement…" : "Enregistrer"}
    </button>
  );
}

interface StatusUpdateFormProps {
  complaint: SerializedComplaint;
}

export default function StatusUpdateForm({ complaint }: StatusUpdateFormProps) {
  const [state, formAction] = useActionState(updateComplaintStatus, null);

  return (
    <form action={formAction} className="space-y-3">
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

      <div>
        <label
          htmlFor={`status-${complaint._id}`}
          className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
        >
          Statut
        </label>
        <select
          id={`status-${complaint._id}`}
          name="status"
          defaultValue={complaint.status}
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={`notes-${complaint._id}`}
          className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
        >
          Notes de résolution{" "}
          <span className="font-normal text-zinc-400">(optionnel)</span>
        </label>
        <textarea
          id={`notes-${complaint._id}`}
          name="resolutionNotes"
          rows={2}
          maxLength={1000}
          defaultValue={complaint.resolutionNotes ?? ""}
          placeholder="Décrivez les actions entreprises…"
          className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
      </div>

      <SaveButton />
    </form>
  );
}
