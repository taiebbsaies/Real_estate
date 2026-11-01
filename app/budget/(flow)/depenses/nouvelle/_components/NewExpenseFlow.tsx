"use client";

import { useState } from "react";
import {
  parseExpenseText,
  type ExpenseDraftActionState,
} from "@/app/actions/budget-ai";
import ExpenseForm, {
  type ExpenseFormValues,
} from "@/app/budget/_components/ExpenseForm";
import Alert from "@/app/budget/_components/ui/Alert";
import ExpenseDraftInput from "./ExpenseDraftInput";

type DraftState = {
  form: ExpenseFormValues;
  uncertainFields: string[];
  multipleExpenses: boolean;
};

export default function NewExpenseFlow() {
  const [state, setState] = useState<ExpenseDraftActionState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [draftKey, setDraftKey] = useState(0);

  async function handleDraftSubmit(formData: FormData): Promise<void> {
    setIsSubmitting(true);

    try {
      const nextState = await parseExpenseText(null, formData);

      setState(nextState);

      if (nextState?.success && nextState.draft) {
        setDraft({
          form: {
            id: "",
            amount: nextState.draft.amount,
            date: nextState.draft.date,
            category: nextState.draft.category,
            note: nextState.draft.note,
          },
          uncertainFields: nextState.uncertainFields ?? [],
          multipleExpenses: nextState.multipleExpenses ?? false,
        });
        setDraftKey((key) => key + 1);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ExpenseDraftInput
        formAction={handleDraftSubmit}
        state={state}
        pending={isSubmitting}
      />

      {draft && (
        <Alert kind="warning" role="status">
          <p className="font-medium leading-snug">
            Brouillon IA à vérifier
            {draft.multipleExpenses
              ? " — plusieurs dépenses détectées, seule la première est pré-remplie"
              : ""}
            {" "}:
            les champs signalés méritent votre attention. Rien ne sera
            enregistré avant que vous ne validiez.
          </p>
        </Alert>
      )}

      <ExpenseForm
        mode="create"
        key={draftKey}
        expense={draft?.form}
        highlightFields={draft?.uncertainFields}
      />
    </div>
  );
}
