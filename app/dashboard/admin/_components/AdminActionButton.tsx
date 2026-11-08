"use client";

import { useActionState } from "react";
import type { AdminActionState } from "@/app/actions/admin";

const INITIAL: AdminActionState = { success: false, message: "" };

export default function AdminActionButton({
  action,
  fields,
  label,
  className,
  confirmMessage,
}: {
  action: (previous: AdminActionState, formData: FormData) => Promise<AdminActionState>;
  fields: Record<string, string>;
  label: string;
  className: string;
  confirmMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) event.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" disabled={pending} className={`${className} disabled:opacity-50`}>
        {pending ? "…" : label}
      </button>
      {state.message && (
        <p
          role="status"
          className={`mt-1 text-xs ${
            state.success ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
