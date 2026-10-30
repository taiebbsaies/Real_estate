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
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { CategoryIcon } from "./icons";
import Card from "./ui/Card";
import Alert from "./ui/Alert";
import AmountInput from "./AmountInput";
import ConfirmDialog from "./ConfirmDialog";
import { Button } from "./ui/Button";
import Field, { fieldClass, fieldErrorClass, labelClass } from "./ui/Field";

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

function SubmitButton({ disabled = false }: { disabled?: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="primary"
      className="w-full"
      disabled={pending || disabled}
    >
      {pending ? "Enregistrement…" : "Enregistrer la dépense"}
    </Button>
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
  const isOnline = useOnlineStatus();

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
      <Card className="flex flex-col gap-5">
        <form action={formAction} className="flex flex-col gap-5">
          {mode === "edit" && expense && (
            <input type="hidden" name="id" value={expense.id} />
          )}

          <AmountInput
            id="amount"
            label="Montant"
            hint="En dinars, par exemple 85 / 85,5 / 85,500."
            errors={state?.errors?.amount}
            placeholder="Ex. 85,500"
            defaultValue={expense?.amount ?? ""}
          />

          <Field id="date" label="Date" errors={state?.errors?.date}>
            <input
              id="date"
              name="date"
              type="date"
              required
              aria-invalid={!!state?.errors?.date}
              aria-describedby={state?.errors?.date ? "date-error" : undefined}
              value={dateValue}
              onChange={(event) => setDate(event.target.value)}
              className={fieldClass(!!state?.errors?.date)}
            />
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className={labelClass}>Catégorie</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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
                  <span className="flex min-h-[56px] flex-col items-center justify-center gap-1 break-words rounded-xl border border-zinc-200 bg-white/60 px-1 py-2 text-center text-zinc-500 transition-colors peer-checked:border-zinc-950 peer-checked:bg-zinc-100 peer-checked:text-zinc-950 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-zinc-950 dark:border-zinc-800 dark:bg-[#151518]/60 dark:text-zinc-400 dark:peer-checked:border-zinc-200 dark:peer-checked:bg-zinc-800 dark:peer-checked:text-zinc-100 dark:peer-focus-visible:outline-white">
                    <span aria-hidden="true" className="contents">
                      <CategoryIcon category={category} className="h-5 w-5" />
                    </span>
                    <span className="text-[11px] font-medium leading-tight">
                      {BUDGET_CATEGORY_LABELS[category]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            {state?.errors?.category?.map((error) => (
              <p key={error} className={fieldErrorClass}>
                {error}
              </p>
            ))}
          </fieldset>

          <Field id="note" label="Note (facultatif)" errors={state?.errors?.note}>
            <input
              id="note"
              name="note"
              type="text"
              maxLength={200}
              autoComplete="off"
              aria-invalid={!!state?.errors?.note}
              aria-describedby={state?.errors?.note ? "note-error" : undefined}
              placeholder="Ex. Facture STEG"
              defaultValue={expense?.note ?? ""}
              className={fieldClass(!!state?.errors?.note)}
            />
          </Field>

          {!isOnline && (
            <Alert kind="warning" role="status">
              <p className="font-medium leading-snug">
                Vous êtes hors ligne : la dépense ne peut pas être enregistrée
                pour le moment.
              </p>
            </Alert>
          )}

          <SubmitButton disabled={!isOnline} />

          {state?.message && !state.success && (
            <Alert kind="error" role="alert">
              <p className="font-medium">{state.message}</p>
            </Alert>
          )}
        </form>
      </Card>

      {mode === "edit" && expense && (
        <section className="flex flex-col gap-3">
          <Button
            variant="danger"
            className="w-full"
            disabled={!isOnline}
            onClick={() => dialogRef.current?.showModal()}
          >
            Supprimer
          </Button>

          <ConfirmDialog
            dialogRef={dialogRef}
            labelledBy="delete-expense-title"
            title="Supprimer cette dépense ?"
            description="Cette action est définitive."
            confirmLabel="Supprimer"
            disabled={!isOnline}
            stateMessage={deleteState?.message}
            stateSuccess={deleteState?.success}
            hiddenInputs={{ id: expense.id }}
            onConfirm={deleteAction}
          />
        </section>
      )}
    </div>
  );
}
