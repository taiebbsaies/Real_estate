"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteComplaint } from "@/app/actions/complaints";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-8 items-center justify-center rounded-lg bg-red-600 px-3 text-xs font-semibold text-white transition hover:bg-red-700 active:scale-95 disabled:opacity-60 dark:bg-red-700 dark:hover:bg-red-600"
    >
      {pending ? "Suppression…" : "Confirmer"}
    </button>
  );
}

interface DeleteComplaintButtonProps {
  complaintId: string;
}

export default function DeleteComplaintButton({ complaintId }: DeleteComplaintButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(deleteComplaint, null);

  if (state?.success) {
    return (
      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
        ✓ Supprimée
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        id={`delete-complaint-${complaintId}`}
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex h-8 items-center justify-center rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-800/60 dark:text-red-400 dark:hover:bg-red-950/40"
      >
        Supprimer
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {state && !state.success && (
        <p className="w-full text-xs text-red-600 dark:text-red-400">{state.message}</p>
      )}
      <span className="text-xs text-zinc-600 dark:text-zinc-400">Confirmer ?</span>
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="id" value={complaintId} />
        <DeleteButton />
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="inline-flex h-8 items-center justify-center rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          Annuler
        </button>
      </form>
    </div>
  );
}
