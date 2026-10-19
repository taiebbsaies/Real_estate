"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { upsertBudget } from "@/app/actions/budget";
import { millimesToTnd } from "@/lib/budget/calculations";

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
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-xl bg-[var(--budget-primary)] text-[15px] font-semibold text-white transition-colors hover:bg-[var(--budget-primary-dark)] disabled:opacity-50"
    >
      {pending ? "Enregistrement…" : "Enregistrer"}
    </button>
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
    <section className="flex flex-col gap-5 rounded-[16px] border border-[var(--budget-border)] bg-[var(--budget-surface)] p-5">
      <h2 className="budget-heading text-[18px] font-medium text-[var(--budget-secondary)]">
        {hasBudget ? "Modifier le plafond" : "Plafond mensuel"}
      </h2>

      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="month" value={month} />

        {state?.errors?.month?.map((error) => (
          <p key={error} className="text-[13px] font-medium text-[var(--budget-primary)]">
            {error}
          </p>
        ))}

        <div className="flex flex-col gap-2">
          <label htmlFor="limit" className="text-[13px] font-medium text-[var(--budget-muted)]">
            Plafond mensuel (TND)
          </label>
          <div className="flex h-12 items-center rounded-xl border border-[var(--budget-border-strong)] bg-[var(--budget-input-bg)] px-4 transition-colors focus-within:border-[var(--budget-primary)]">
            <input
              id="limit"
              name="limit"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              required
              placeholder="Ex. 1 100,000"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              className="budget-tabular w-full bg-transparent text-[18px] font-semibold outline-none placeholder:font-normal placeholder:text-[var(--budget-muted)]/60"
            />
            <span className="ml-2 shrink-0 text-[13px] font-medium text-[var(--budget-muted)]">
              TND
            </span>
          </div>
          <p className="text-[12px] text-[var(--budget-muted)]">
            Le montant maximum que vous autorisez pour ce mois.
          </p>
          {state?.errors?.limit?.map((error) => (
            <p key={error} className="text-[12px] font-medium text-[var(--budget-primary)]">
              {error}
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="income" className="text-[13px] font-medium text-[var(--budget-muted)]">
            Revenu mensuel (optionnel)
          </label>
          <div className="flex h-12 items-center rounded-xl border border-[var(--budget-border-strong)] bg-[var(--budget-input-bg)] px-4 transition-colors focus-within:border-[var(--budget-primary)]">
            <input
              id="income"
              name="income"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Ex. 1 800,000"
              value={income}
              onChange={(event) => setIncome(event.target.value)}
              className="budget-tabular w-full bg-transparent text-[16px] font-medium outline-none placeholder:font-normal placeholder:text-[var(--budget-muted)]/60"
            />
            <span className="ml-2 shrink-0 text-[13px] font-medium text-[var(--budget-muted)]">
              TND
            </span>
          </div>
          <p className="text-[12px] text-[var(--budget-muted)]">
            Le revenu sert uniquement de repère, il n&apos;est jamais requis.
          </p>
          {state?.errors?.income?.map((error) => (
            <p key={error} className="text-[12px] font-medium text-[var(--budget-primary)]">
              {error}
            </p>
          ))}
        </div>

        {showReuseButton && (
          <button
            type="button"
            onClick={reusePreviousBudget}
            className="h-11 rounded-xl border border-[var(--budget-border-strong)] px-4 text-left text-[13px] font-medium text-[var(--budget-text)] transition-colors hover:bg-[var(--budget-bg)]"
          >
            Reprendre le budget de {previousMonthLabel} (
            <span className="budget-tabular">
              {previousBudget ? millimesToTnd(previousBudget.limit) : ""} TND
            </span>
            )
          </button>
        )}

        <SubmitButton />

        {state?.message && (
          <p
            role="status"
            className={`text-[13px] font-medium ${
              state.success
                ? "text-[var(--budget-secondary)]"
                : "text-[var(--budget-primary)]"
            }`}
          >
            {state.message}
          </p>
        )}
      </form>
    </section>
  );
}
