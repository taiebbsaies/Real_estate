"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { deleteBudget, upsertBudget } from "@/app/actions/budget";
import { millimesToTnd } from "@/lib/budget/calculations";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import Card from "../../../_components/ui/Card";
import Alert from "../../../_components/ui/Alert";
import { Button } from "../../../_components/ui/Button";
import Field, {
  fieldShellClass,
  fieldErrorClass,
} from "../../../_components/ui/Field";

type BudgetFormProps = {
  month: string;
  initialLimit: string;
  initialIncome: string;
  hasBudget: boolean;
  previousBudget: { limit: number; income?: number } | null;
  previousMonthLabel: string;
};

function SubmitButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="primary"
      className="w-full"
      disabled={pending || disabled}
    >
      {pending ? "Enregistrement…" : "Enregistrer"}
    </Button>
  );
}

export default function BudgetForm({
  month,
  initialLimit,
  initialIncome,
  hasBudget,
  previousBudget,
  previousMonthLabel,
}: BudgetFormProps) {
  const [state, formAction] = useActionState(upsertBudget, null);
  const [deleteState, deleteAction] = useActionState(deleteBudget, null);
  const [limit, setLimit] = useState(initialLimit);
  const [income, setIncome] = useState(initialIncome);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const isOnline = useOnlineStatus();

  const showReuseButton = !hasBudget && previousBudget !== null;

  useEffect(() => {
    if (deleteState?.success) {
      dialogRef.current?.close();
      router.refresh();
    }
  }, [deleteState, router]);

  function reusePreviousBudget() {
    if (!previousBudget) {
      return;
    }

    setLimit(millimesToTnd(previousBudget.limit));
    setIncome(
      previousBudget.income !== undefined
        ? millimesToTnd(previousBudget.income)
        : "",
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-5">
        <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
          {hasBudget ? "Modifier le plafond" : "Plafond mensuel"}
        </h2>

      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="month" value={month} />

        {state?.errors?.month?.map((error) => (
          <p key={error} className={fieldErrorClass}>
            {error}
          </p>
        ))}

        <Field
          id="limit"
          label="Plafond mensuel (TND)"
          hint="Le montant maximum que vous autorisez pour ce mois."
          errors={state?.errors?.limit}
        >
          <div className={fieldShellClass(!!state?.errors?.limit)}>
            <input
              id="limit"
              name="limit"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              required
              aria-invalid={!!state?.errors?.limit}
              aria-describedby={state?.errors?.limit ? "limit-error" : undefined}
              placeholder="Ex. 1 100,000"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              className="tabular-nums w-full bg-transparent text-lg font-semibold text-zinc-900 outline-none placeholder:font-normal placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-600"
            />
            <span className="ml-2 shrink-0 text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
              TND
            </span>
          </div>
        </Field>

        <Field
          id="income"
          label="Revenu mensuel (optionnel)"
          hint="Le revenu sert uniquement de repère, il n'est jamais requis."
          errors={state?.errors?.income}
        >
          <div className={fieldShellClass(!!state?.errors?.income)}>
            <input
              id="income"
              name="income"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              aria-invalid={!!state?.errors?.income}
              aria-describedby={state?.errors?.income ? "income-error" : undefined}
              placeholder="Ex. 1 800,000"
              value={income}
              onChange={(event) => setIncome(event.target.value)}
              className="tabular-nums w-full bg-transparent text-base font-medium text-zinc-900 outline-none placeholder:font-normal placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-600"
            />
            <span className="ml-2 shrink-0 text-[13px] font-medium text-zinc-500 dark:text-zinc-400">
              TND
            </span>
          </div>
        </Field>

        {showReuseButton && (
          <button
            type="button"
            onClick={reusePreviousBudget}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white/60 px-4 text-left text-[13px] font-medium text-zinc-800 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#151518]/60 dark:text-zinc-300 dark:hover:border-zinc-700"
          >
            Reprendre le budget de {previousMonthLabel} (
            <span className="tabular-nums">
              {previousBudget ? millimesToTnd(previousBudget.limit) : ""} TND
            </span>
            )
          </button>
        )}

        {!isOnline && (
          <Alert kind="warning" role="status">
            <p className="font-medium leading-snug">
              Vous êtes hors ligne : le budget ne peut pas être enregistré pour
              le moment.
            </p>
          </Alert>
        )}

        <SubmitButton disabled={!isOnline} />

        {state?.message && (
          <Alert kind={state.success ? "success" : "error"} role="status">
            <p className="font-medium">{state.message}</p>
          </Alert>
        )}
      </form>
      </Card>

      {hasBudget && (
        <section className="flex flex-col gap-3">
          <Button
            variant="danger"
            className="w-full"
            disabled={!isOnline}
            onClick={() => dialogRef.current?.showModal()}
          >
            Supprimer le budget
          </Button>

          <dialog
            ref={dialogRef}
            aria-labelledby="delete-budget-title"
            className="w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl backdrop:bg-zinc-950/40 dark:border-zinc-800 dark:bg-[#111114]"
          >
            <h3
              id="delete-budget-title"
              className="text-base font-bold text-zinc-950 dark:text-zinc-50"
            >
              Supprimer ce budget ?
            </h3>
            <p className="mt-2 text-[13px] text-zinc-500 dark:text-zinc-400">
              Les dépenses enregistrées ce mois-ci seront conservées.
            </p>

            {deleteState?.message && !deleteState.success && (
              <Alert kind="error" role="alert" className="mt-2">
                <p className="font-medium">{deleteState.message}</p>
              </Alert>
            )}

            <div className="mt-4 flex gap-3">
              <Button
                variant="secondary"
                className="h-11 flex-1"
                onClick={() => dialogRef.current?.close()}
              >
                Annuler
              </Button>
              <form action={deleteAction} className="flex-1">
                <input type="hidden" name="month" value={month} />
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full"
                  disabled={!isOnline}
                >
                  Supprimer
                </Button>
              </form>
            </div>
          </dialog>
        </section>
      )}
    </div>
  );
}
