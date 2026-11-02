"use client";

import { useRef, useState } from "react";
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
import Alert from "@/app/budget/_components/ui/Alert";
import { Button } from "@/app/budget/_components/ui/Button";
import {
  resolveAnalysis,
  type DraftPayload,
  type AnalysisOutcome,
} from "@/lib/ai/analysis-response";
import ExpenseDraftInput from "./ExpenseDraftInput";
import ExpenseFileInput from "./ExpenseFileInput";

type DraftState = {
  form: ExpenseFormValues;
  uncertainFields: string[];
  multipleExpenses: boolean;
};

const FILE_THROWN_MESSAGE = "Fichier trop volumineux ou envoi impossible.";

export default function NewExpenseFlow() {
  const [state, setState] = useState<ExpenseDraftActionState | null>(null);
  const [fileState, setFileState] = useState<ExpenseFileActionState | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [draftKey, setDraftKey] = useState(0);
  const [heldDraft, setHeldDraft] = useState<DraftPayload | null>(null);
  const requestSeq = useRef(0);
  const formDirtyRef = useRef(false);

  function applyDraft(payload: DraftPayload): void {
    setDraft({
      form: {
        id: "",
        amount: payload.amount,
        date: payload.date,
        category: payload.category,
        note: payload.note,
      },
      uncertainFields: payload.uncertainFields,
      multipleExpenses: payload.multipleExpenses,
    });
    setDraftKey((key) => key + 1);
    formDirtyRef.current = false;
    setHeldDraft(null);
  }

  function applyHeldDraft(): void {
    if (heldDraft) {
      applyDraft(heldDraft);
    }
  }

  function markFormDirty(): void {
    formDirtyRef.current = true;
  }

  function consumeOutcome(outcome: AnalysisOutcome): void {
    if (outcome.kind === "apply") {
      applyDraft(outcome.draft);
    } else if (outcome.kind === "hold") {
      setHeldDraft(outcome.draft);
    }
  }

  async function handleDraftSubmit(formData: FormData): Promise<void> {
    const seq = ++requestSeq.current;

    setBusy(true);

    try {
      const nextState = await parseExpenseText(null, formData);
      const outcome = resolveAnalysis({
        seq,
        latestSeq: requestSeq.current,
        formDirty: formDirtyRef.current,
        response: nextState,
        thrownMessage: "",
      });

      if (outcome.kind === "stale") {
        return;
      }

      setState(nextState);
      consumeOutcome(outcome);
    } finally {
      if (seq === requestSeq.current) {
        setBusy(false);
      }
    }
  }

  async function handleFileSubmit(formData: FormData): Promise<void> {
    const seq = ++requestSeq.current;

    setBusy(true);

    try {
      const nextState = await parseExpenseFile(null, formData);
      const outcome = resolveAnalysis({
        seq,
        latestSeq: requestSeq.current,
        formDirty: formDirtyRef.current,
        response: nextState,
        thrownMessage: FILE_THROWN_MESSAGE,
      });

      if (outcome.kind === "stale") {
        return;
      }

      setFileState(nextState);
      consumeOutcome(outcome);
    } catch {
      const outcome = resolveAnalysis({
        seq,
        latestSeq: requestSeq.current,
        formDirty: formDirtyRef.current,
        response: null,
        thrownMessage: FILE_THROWN_MESSAGE,
      });

      if (outcome.kind === "error") {
        setFileState({ success: false, message: outcome.message });
      }
    } finally {
      if (seq === requestSeq.current) {
        setBusy(false);
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <ExpenseDraftInput
        formAction={handleDraftSubmit}
        state={state}
        pending={busy}
      />

      <ExpenseFileInput
        formAction={handleFileSubmit}
        state={fileState}
        pending={busy}
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

      {heldDraft && (
        <Alert kind="success" role="status">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium leading-snug">
              Le brouillon IA est prêt. Le formulaire contient déjà vos
              modifications : l&apos;appliquer remplacera leur contenu.
            </p>
            <Button variant="secondary" onClick={applyHeldDraft}>
              Appliquer
            </Button>
          </div>
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

      <div onChange={markFormDirty}>
        <ExpenseForm
          mode="create"
          key={draftKey}
          expense={draft?.form}
          highlightFields={draft?.uncertainFields}
        />
      </div>
    </div>
  );
}
