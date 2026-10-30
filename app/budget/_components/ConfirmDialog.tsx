"use client";

import type { RefObject } from "react";
import Alert from "./ui/Alert";
import { Button } from "./ui/Button";

type ConfirmDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  labelledBy: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  disabled?: boolean;
  stateMessage?: string;
  stateSuccess?: boolean;
  hiddenInputs?: Record<string, string>;
  onConfirm: (formData: FormData) => void | Promise<void>;
};

const dialogClass =
  "w-full max-w-none rounded-t-3xl border border-zinc-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl backdrop:bg-zinc-950/40 mt-auto mb-0 max-h-[85dvh] overflow-y-auto md:mb-auto md:mx-auto md:w-[calc(100%-2rem)] md:max-w-sm md:rounded-2xl dark:border-zinc-800 dark:bg-[#111114]";

export default function ConfirmDialog({
  dialogRef,
  labelledBy,
  title,
  description,
  confirmLabel,
  cancelLabel = "Annuler",
  disabled = false,
  stateMessage,
  stateSuccess,
  hiddenInputs = {},
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <dialog ref={dialogRef} aria-labelledby={labelledBy} className={dialogClass}>
      <h3 id={labelledBy} className="text-base font-bold text-zinc-950 dark:text-zinc-50">
        {title}
      </h3>
      <p className="mt-2 text-[13px] text-zinc-500 dark:text-zinc-400">
        {description}
      </p>

      {stateMessage && !stateSuccess && (
        <Alert kind="error" role="alert" className="mt-2">
          <p className="font-medium">{stateMessage}</p>
        </Alert>
      )}

      <div className="mt-4 flex gap-3">
        <Button
          variant="secondary"
          className="flex-1"
          onClick={() => dialogRef.current?.close()}
        >
          {cancelLabel}
        </Button>
        <form action={onConfirm} className="flex-1">
          {Object.entries(hiddenInputs).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <Button type="submit" variant="destructive" className="w-full" disabled={disabled}>
            {confirmLabel}
          </Button>
        </form>
      </div>
    </dialog>
  );
}
