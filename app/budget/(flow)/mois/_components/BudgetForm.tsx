"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { deleteBudget, upsertBudget } from "@/app/actions/budget";
import { millimesToTnd } from "@/lib/budget/calculations";
import {
  BUDGET_CATEGORIES,
  BUDGET_CATEGORY_LABELS,
  type BudgetCategory,
} from "@/lib/constants/budget";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import AmountInput from "../../../_components/AmountInput";
import ConfirmDialog from "../../../_components/ConfirmDialog";
import Card from "../../../_components/ui/Card";
import Alert from "../../../_components/ui/Alert";
import { Button } from "../../../_components/ui/Button";
import { fieldErrorClass } from "../../../_components/ui/Field";

type CategoryLimitValues = Record<BudgetCategory, string>;

type BudgetFormProps = {
  month: string;
  initialLimit: string;
  initialIncome: string;
  initialCategoryLimits: CategoryLimitValues;
  hasBudget: boolean;
  previousBudget: {
    limit: number;
    income?: number;
    categoryLimits?: Partial<Record<BudgetCategory, number>>;
  } | null;
  previousMonthLabel: string;
};

function toCategoryLimitValues(
  limits: Partial<Record<BudgetCategory, number>> | undefined,
): CategoryLimitValues {
  return Object.fromEntries(
    BUDGET_CATEGORIES.map((category) => [
      category,
      limits?.[category] !== undefined
        ? millimesToTnd(limits[category])
        : "",
    ]),
  ) as CategoryLimitValues;
}

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
  initialCategoryLimits,
  hasBudget,
  previousBudget,
  previousMonthLabel,
}: BudgetFormProps) {
  const [state, formAction] = useActionState(upsertBudget, null);
  const [deleteState, deleteAction] = useActionState(deleteBudget, null);
  const [limit, setLimit] = useState(initialLimit);
  const [income, setIncome] = useState(initialIncome);
  const [categoryLimits, setCategoryLimits] =
    useState<CategoryLimitValues>(initialCategoryLimits);
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
    setCategoryLimits(toCategoryLimitValues(previousBudget.categoryLimits));
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

        <AmountInput
          id="limit"
          label="Plafond mensuel (TND)"
          hint="Le montant maximum que vous autorisez pour ce mois."
          errors={state?.errors?.limit}
          placeholder="Ex. 1 100,000"
          value={limit}
          onChange={(event) => setLimit(event.target.value)}
        />

        <AmountInput
          id="income"
          label="Revenu mensuel (optionnel)"
          hint="Le revenu sert uniquement de repère, il n'est jamais requis."
          errors={state?.errors?.income}
          placeholder="Ex. 1 800,000"
          size="md"
          required={false}
          value={income}
          onChange={(event) => setIncome(event.target.value)}
        />

        <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
              Plafonds par catégorie (optionnel)
            </h3>
            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Fixez un plafond par catégorie pour être alerté en cas de risque
              de dépassement. Laissez vide une catégorie sans plafond.
            </p>
            {state?.errors?.categoryLimits?.map((error) => (
              <p key={error} className={fieldErrorClass}>
                {error}
              </p>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {BUDGET_CATEGORIES.map((category) => (
              <AmountInput
                key={category}
                id={`categoryLimits.${category}`}
                label={BUDGET_CATEGORY_LABELS[category]}
                placeholder="Optionnel"
                size="md"
                required={false}
                value={categoryLimits[category]}
                onChange={(event) =>
                  setCategoryLimits((previous) => ({
                    ...previous,
                    [category]: event.target.value,
                  }))
                }
              />
            ))}
          </div>
        </div>

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

          <ConfirmDialog
            dialogRef={dialogRef}
            labelledBy="delete-budget-title"
            title="Supprimer ce budget ?"
            description="Les dépenses enregistrées ce mois-ci seront conservées."
            confirmLabel="Supprimer"
            disabled={!isOnline}
            stateMessage={deleteState?.message}
            stateSuccess={deleteState?.success}
            hiddenInputs={{ month }}
            onConfirm={deleteAction}
          />
        </section>
      )}
    </div>
  );
}
