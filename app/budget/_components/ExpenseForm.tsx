"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  createExpense,
  deleteExpense,
  updateExpense,
} from "@/app/actions/budget";
import {
  BUDGET_CATEGORIES,
  BUDGET_CATEGORY_LABELS,
  type BudgetCategory,
} from "@/lib/constants/budget";
import { CategoryIcon } from "./icons";

export type ExpenseFormValues = {
  id: string;
  amount: string;
  date: string;
  category: BudgetCategory;
  note: string;
};

type ExpenseFormProps = {
  mode: "create" | "edit";
  expense?: ExpenseFormValues;
};

function todayLocalIso(): string {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

const subscribeToNothing = () => () => {};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-xl bg-[var(--budget-primary)] text-[15px] font-semibold text-white transition-colors hover:bg-[var(--budget-primary-dark)] disabled:opacity-50"
    >
      {pending ? "Enregistrement…" : "Enregistrer la dépense"}
    </button>
  );
}

export default function ExpenseForm({ mode, expense }: ExpenseFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState(
    mode === "create" ? createExpense : updateExpense,
    null,
  );
  const [deleteState, deleteAction] = useActionState(deleteExpense, null);
  const [date, setDate] = useState<string | undefined>(expense?.date);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const today = useSyncExternalStore(
    subscribeToNothing,
    todayLocalIso,
    () => "",
  );
  const dateValue = date ?? today;

  useEffect(() => {
    if (state?.success) {
      const month = (dateValue || todayLocalIso()).slice(0, 7);
      router.push(`/budget/depenses?month=${month}`);
    }
  }, [state, dateValue, router]);

  useEffect(() => {
    if (deleteState?.success) {
      dialogRef.current?.close();
      const month = (dateValue || todayLocalIso()).slice(0, 7);
      router.push(`/budget/depenses?month=${month}`);
    }
  }, [deleteState, dateValue, router]);

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-5 rounded-[16px] border border-[var(--budget-border)] bg-[var(--budget-surface)] p-5">
        <form action={formAction} className="flex flex-col gap-5">
          {mode === "edit" && expense && (
            <input type="hidden" name="id" value={expense.id} />
          )}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="amount"
              className="text-[13px] font-medium text-[var(--budget-muted)]"
            >
              Montant
            </label>
            <div className="flex h-12 items-center rounded-xl border border-[var(--budget-border-strong)] bg-[var(--budget-input-bg)] px-4 transition-colors focus-within:border-[var(--budget-primary)]">
              <input
                id="amount"
                name="amount"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                required
                placeholder="Ex. 85,500"
                defaultValue={expense?.amount ?? ""}
                className="budget-tabular w-full bg-transparent text-[18px] font-semibold outline-none placeholder:font-normal placeholder:text-[var(--budget-muted)]/60"
              />
              <span className="ml-2 shrink-0 text-[13px] font-medium text-[var(--budget-muted)]">
                TND
              </span>
            </div>
            <p className="text-[12px] text-[var(--budget-muted)]">
              En dinars, par exemple 85 / 85,5 / 85,500.
            </p>
            {state?.errors?.amount?.map((error) => (
              <p
                key={error}
                className="text-[12px] font-medium text-[var(--budget-primary)]"
              >
                {error}
              </p>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="date"
              className="text-[13px] font-medium text-[var(--budget-muted)]"
            >
              Date
            </label>
            <div className="flex h-12 items-center rounded-xl border border-[var(--budget-border-strong)] bg-[var(--budget-input-bg)] px-4 transition-colors focus-within:border-[var(--budget-primary)]">
              <input
                id="date"
                name="date"
                type="date"
                required
                value={dateValue}
                onChange={(event) => setDate(event.target.value)}
                className="w-full bg-transparent text-[15px] outline-none"
              />
            </div>
            {state?.errors?.date?.map((error) => (
              <p
                key={error}
                className="text-[12px] font-medium text-[var(--budget-primary)]"
              >
                {error}
              </p>
            ))}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-[13px] font-medium text-[var(--budget-muted)]">
              Catégorie
            </legend>
            <div className="grid grid-cols-4 gap-2">
              {BUDGET_CATEGORIES.map((category) => (
                <label key={category} className="cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    value={category}
                    required
                    defaultChecked={expense?.category === category}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl border border-[var(--budget-border)] bg-[var(--budget-bg)] px-1 py-2 text-center text-[var(--budget-muted)] transition-colors peer-checked:border-[var(--budget-primary)] peer-checked:bg-[var(--budget-primary-soft)] peer-checked:text-[var(--budget-primary)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--budget-primary)]">
                    <span aria-hidden="true" className="contents">
                      <CategoryIcon category={category} className="h-5 w-5" />
                    </span>
                    <span className="text-[10px] font-medium leading-tight">
                      {BUDGET_CATEGORY_LABELS[category]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {state?.errors?.category?.map((error) => (
              <p
                key={error}
                className="text-[12px] font-medium text-[var(--budget-primary)]"
              >
                {error}
              </p>
            ))}
          </fieldset>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="note"
              className="text-[13px] font-medium text-[var(--budget-muted)]"
            >
              Note (facultatif)
            </label>
            <div className="flex h-12 items-center rounded-xl border border-[var(--budget-border-strong)] bg-[var(--budget-input-bg)] px-4 transition-colors focus-within:border-[var(--budget-primary)]">
              <input
                id="note"
                name="note"
                type="text"
                maxLength={200}
                autoComplete="off"
                placeholder="Ex. Facture STEG"
                defaultValue={expense?.note ?? ""}
                className="w-full bg-transparent text-[15px] outline-none placeholder:text-[var(--budget-muted)]/60"
              />
            </div>
            {state?.errors?.note?.map((error) => (
              <p
                key={error}
                className="text-[12px] font-medium text-[var(--budget-primary)]"
              >
                {error}
              </p>
            ))}
          </div>

          <SubmitButton />

          {state?.message && !state.success && (
            <p
              role="alert"
              className="text-[13px] font-medium text-[var(--budget-primary)]"
            >
              {state.message}
            </p>
          )}
        </form>
      </section>

      {mode === "edit" && expense && (
        <section className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className="h-12 w-full rounded-xl border border-[var(--budget-primary)]/40 text-[14px] font-medium text-[var(--budget-primary)] transition-colors hover:bg-[var(--budget-primary-soft)]"
          >
            Supprimer
          </button>

          <dialog
            ref={dialogRef}
            aria-labelledby="delete-expense-title"
            className="w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-[var(--budget-border)] bg-[var(--budget-surface)] p-5 backdrop:bg-[rgba(31,36,33,0.4)]"
          >
            <h3
              id="delete-expense-title"
              className="budget-heading text-[18px] font-medium text-[var(--budget-text)]"
            >
              Supprimer cette dépense ?
            </h3>
            <p className="mt-2 text-[13px] text-[var(--budget-muted)]">
              Cette action est définitive.
            </p>

            {deleteState?.message && !deleteState.success && (
              <p
                role="alert"
                className="mt-2 text-[13px] font-medium text-[var(--budget-primary)]"
              >
                {deleteState.message}
              </p>
            )}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="h-11 flex-1 rounded-xl border border-[var(--budget-border-strong)] text-[14px] font-medium text-[var(--budget-text)] transition-colors hover:bg-[var(--budget-bg)]"
              >
                Annuler
              </button>
              <form action={deleteAction} className="flex-1">
                <input type="hidden" name="id" value={expense.id} />
                <button
                  type="submit"
                  className="h-11 w-full rounded-xl bg-[var(--budget-primary)] text-[14px] font-semibold text-white transition-colors hover:bg-[var(--budget-primary-dark)]"
                >
                  Supprimer
                </button>
              </form>
            </div>
          </dialog>
        </section>
      )}
    </div>
  );
}
