"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { updateComplaintStatus } from "@/app/actions/complaints";
import type { SerializedComplaint } from "@/lib/complaints/types";
import {
  getAllowedStatusOptions,
  type ComplaintStatus,
} from "@/lib/constants/complaint";

const STATUS_LABELS: Record<ComplaintStatus, string> = {
  pending: "En attente",
  in_progress: "En cours",
  resolved: "Résolue",
  rejected: "Rejetée",
};

const NOTE_REQUIRED_STATUSES: ComplaintStatus[] = ["resolved", "rejected"];

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
  const [selectedStatus, setSelectedStatus] = useState<ComplaintStatus>(
    complaint.status,
  );

  const allowedStatuses = getAllowedStatusOptions(complaint.status);
  const noteRequired = NOTE_REQUIRED_STATUSES.includes(selectedStatus);

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
          value={selectedStatus}
          onChange={(event) =>
            setSelectedStatus(event.target.value as ComplaintStatus)
          }
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          {allowedStatuses.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-zinc-400">
          Seules les transitions autorisées sont proposées.
        </p>
      </div>

      <div>
        <label
          htmlFor={`notes-${complaint._id}`}
          className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400"
        >
          Notes de résolution{" "}
          {noteRequired ? (
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
          ) : (
            <span className="font-normal text-zinc-400">(optionnel)</span>
          )}
        </label>
        <textarea
          id={`notes-${complaint._id}`}
          name="resolutionNotes"
          rows={2}
          required={noteRequired}
          maxLength={1000}
          defaultValue={complaint.resolutionNotes ?? ""}
          placeholder={
            noteRequired
              ? "Expliquez la résolution ou le motif du rejet…"
              : "Décrivez les actions entreprises…"
          }
          className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {state?.errors?.resolutionNotes?.[0] && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
            {state.errors.resolutionNotes[0]}
          </p>
        )}
        {noteRequired && (
          <p className="mt-1 text-[11px] text-zinc-400">
            Une note est obligatoire pour clôturer ou rejeter la réclamation.
          </p>
        )}
      </div>

      <SaveButton />
    </form>
  );
}
