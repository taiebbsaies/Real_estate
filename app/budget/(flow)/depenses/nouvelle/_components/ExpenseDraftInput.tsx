"use client";

import type { ExpenseDraftActionState } from "@/app/actions/budget-ai";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { ZapIcon } from "@/app/budget/_components/icons";
import Alert from "@/app/budget/_components/ui/Alert";
import { Button } from "@/app/budget/_components/ui/Button";
import Card from "@/app/budget/_components/ui/Card";
import {
  fieldClass,
  fieldErrorClass,
  labelClass,
} from "@/app/budget/_components/ui/Field";

type ExpenseDraftInputProps = {
  formAction: (formData: FormData) => void | Promise<void>;
  state: ExpenseDraftActionState | null;
  pending: boolean;
};

export default function ExpenseDraftInput({
  formAction,
  state,
  pending,
}: ExpenseDraftInputProps) {
  const isOnline = useOnlineStatus();
  const textErrors = state && !state.success ? state.errors?.text : undefined;

  return (
    <Card className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-col gap-3">
        <label htmlFor="expense-text" className={labelClass}>
          Décrivez votre dépense
        </label>
        <textarea
          id="expense-text"
          name="text"
          rows={2}
          maxLength={300}
          required
          autoComplete="off"
          disabled={pending}
          placeholder="Ex. j'ai payé 85 dinars d'électricité hier"
          aria-invalid={!!textErrors}
          aria-describedby={textErrors ? "expense-text-error" : undefined}
          className={fieldClass(!!textErrors)}
        />
        {textErrors?.map((error) => (
          <p
            key={error}
            id="expense-text-error"
            className={fieldErrorClass}
          >
            {error}
          </p>
        ))}

        {!isOnline && (
          <Alert kind="warning" role="status">
            <p className="font-medium leading-snug">
              Vous êtes hors ligne : la pré-saisie IA est indisponible. Le
              formulaire ci-dessous reste utilisable.
            </p>
          </Alert>
        )}

        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={pending || !isOnline}
        >
          <ZapIcon className="h-4 w-4" />
          {pending ? "Analyse en cours…" : "Pré-remplir avec l'IA"}
        </Button>

        {state && !state.success && state.message && (
          <Alert kind="error" role="alert">
            <p className="font-medium">{state.message}</p>
          </Alert>
        )}

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          La pré-saisie IA est facultative : le formulaire ci-dessous reste
          utilisable seul.
        </p>
      </form>
    </Card>
  );
}

