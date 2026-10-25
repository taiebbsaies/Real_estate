"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { upsertBudget } from "@/app/actions/budget";
import { millimesToTnd } from "@/lib/budget/calculations";
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

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="primary" className="w-full" disabled={pending}>
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
  const [limit, setLimit] = useState(initialLimit);
  const [income, setIncome] = useState(initialIncome);

  const showReuseButton = !hasBudget && previousBudget !== null;

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

        <SubmitButton />

        {state?.message && (
          <Alert kind={state.success ? "success" : "error"} role="status">
            <p className="font-medium">{state.message}</p>
          </Alert>
        )}
      </form>
    </Card>
  );
}
