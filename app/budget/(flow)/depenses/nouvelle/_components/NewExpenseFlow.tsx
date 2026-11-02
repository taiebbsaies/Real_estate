"use client";

import { useState } from "react";
import {
  parseExpenseText,
  type ExpenseDraftActionState,
} from "@/app/actions/budget-ai";
import {
  parseExpenseFile,
  type ExpenseFileActionState,
} from "@/app/actions/budget-ai-file";
import ExpenseForm, {
  type ExpenseFormValues,
} from "@/app/budget/_components/ExpenseForm";
import type { BudgetCategory } from "@/lib/constants/budget";
import Alert from "@/app/budget/_components/ui/Alert";
import ExpenseDraftInput from "./ExpenseDraftInput";
import ExpenseFileInput from "./ExpenseFileInput";

type DraftState = {
  form: ExpenseFormValues;
  uncertainFields: string[];
  multipleExpenses: boolean;
};

export default function NewExpenseFlow() {
  const [state, setState] = useState<ExpenseDraftActionState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileState, setFileState] = useState<ExpenseFileActionState | null>(
    null,
  );
  const [isScanning, setIsScanning] = useState(false);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [draftKey, setDraftKey] = useState(0);

  function applyDraft(nextState: {
    draft?: {
      amount: string;
      date: string;
      category: BudgetCategory;
      note: string;
    };
    uncertainFields?: string[];
    multipleExpenses?: boolean;
  }): void {
    if (nextState.draft) {
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
  }

  async function handleDraftSubmit(formData: FormData): Promise<void> {
    setIsSubmitting(true);

    try {
      const nextState = await parseExpenseText(null, formData);

      setState(nextState);
      applyDraft(nextState);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFileSubmit(formData: FormData): Promise<void> {
    setIsScanning(true);

    try {
      const nextState = await parseExpenseFile(null, formData);

      setFileState(nextState);
      applyDraft(nextState);
    } catch {
      setFileState({
        success: false,
        message: "Fichier trop volumineux ou envoi impossible.",
      });
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ExpenseDraftInput
        formAction={handleDraftSubmit}
        state={state}
        pending={isSubmitting}
      />

      <ExpenseFileInput
        formAction={handleFileSubmit}
        state={fileState}
        pending={isScanning}
      />

      {fileState?.success && fileState.possibleDuplicate && (
        <Alert kind="warning" role="status">
          <p className="font-medium leading-snug">
            {"Une dépense avec le même montant et la même date existe déjà. "}
            Vérifiez qu&apos;il ne s&apos;agit pas d&apos;un doublon avant
            d&apos;enregistrer.
          </p>
        </Alert>
      )}

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
