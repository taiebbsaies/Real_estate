"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createComplaint, updateComplaint } from "@/app/actions/complaints";
import type { ComplaintActionState, SerializedComplaint } from "@/lib/complaints/types";
import { formatTestPropertyCode } from "@/lib/test-properties/display";
import type { SerializedTestProperty } from "@/lib/test-properties/types";
import { COMPLAINT_CATEGORIES, COMPLAINT_PRIORITIES } from "@/lib/constants/complaint";
import { createComplaintSchema } from "@/lib/validations/complaint";
import { removeDraft, saveDraft } from "./OfflineBanner";

// ─── Category / Priority labels ───────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  plumbing: "Plomberie",
  electricity: "Électricité",
  heating: "Chauffage",
  structural: "Dommages structurels",
  noise: "Nuisances sonores",
  common_areas: "Parties communes",
  other: "Autre",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createClientKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function fieldErrors(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );
}

// ─── Submit button ─────────────────────────────────────────────────────────────

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      id="complaint-submit-btn"
      type="submit"
      disabled={pending}
      className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-zinc-950 px-6 text-sm font-semibold text-white shadow-sm transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
          Envoi en cours…
        </span>
      ) : (
        label
      )}
    </button>
  );
}

function FieldError({ errors, field }: { errors?: Record<string, string[]>; field: string }) {
  const msgs = errors?.[field];
  if (!msgs?.length) return null;
  return (
    <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
      {msgs[0]}
    </p>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ComplaintFormProps {
  /** Scopes local drafts to the authenticated tenant. */
  ownerId: string;
  /** Development-only test apartments actively occupied by this tenant. */
  testProperties?: SerializedTestProperty[];
  editTarget?: SerializedComplaint | null;
  onClose?: () => void;
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function ComplaintForm({ ownerId, testProperties = [], editTarget, onClose }: ComplaintFormProps) {
  const isEditing = !!editTarget;
  const formRef = useRef<HTMLFormElement>(null);
  const clientKeyRef = useRef<string | null>(null);
  const [dismissedState, setDismissedState] = useState<ComplaintActionState | null>(null);

  const submitAction = useCallback(
    async (
      previousState: ComplaintActionState | null,
      formData: FormData,
    ): Promise<ComplaintActionState> => {
      if (isEditing) {
        try {
          return await updateComplaint(previousState, formData);
        } catch {
          return {
            success: false,
            message:
              "Connexion requise pour modifier une réclamation. Votre modification n'a pas été enregistrée.",
          };
        }
      }

      const raw = {
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        category: String(formData.get("category") ?? ""),
        priority: String(formData.get("priority") ?? ""),
        propertyId: String(formData.get("propertyId") ?? ""),
      };

      // Validate locally before creating a draft, so an offline draft that can
      // never be accepted by the server is not queued.
      const parsed = createComplaintSchema.safeParse(raw);
      if (!parsed.success) {
        return {
          success: false,
          message: "Veuillez corriger les champs en surbrillance.",
          errors: fieldErrors(parsed.error),
        };
      }

      const clientKey = clientKeyRef.current ?? createClientKey();
      clientKeyRef.current = clientKey;

      const draft = {
        clientKey,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        priority: parsed.data.priority,
        propertyId: parsed.data.propertyId,
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        saveDraft(ownerId, draft);
        clientKeyRef.current = null;
        return {
          success: true,
          localDraft: true,
          message:
            "Brouillon local enregistré sur cet appareil. Il n'a pas encore été envoyé au serveur.",
        };
      }

      formData.set("clientKey", clientKey);

      try {
        const result = await createComplaint(previousState, formData);
        if (result.success) {
          removeDraft(ownerId, clientKey);
          clientKeyRef.current = null;
        } else {
          // Keep the submitted data so it can be retried or synced later.
          saveDraft(ownerId, draft);
        }
        return result;
      } catch {
        saveDraft(ownerId, draft);
        clientKeyRef.current = null;
        return {
          success: true,
          localDraft: true,
          message:
            "Connexion interrompue. Votre réclamation est conservée comme brouillon local et sera réessayée.",
        };
      }
    },
    [isEditing, ownerId],
  );

  const [state, formAction] = useActionState(submitAction, null);

  // Reset on success (server save or local draft). This only touches the DOM
  // and a ref, never React state synchronously.
  useEffect(() => {
    if (!state?.success) return;

    formRef.current?.reset();
    clientKeyRef.current = null;

    if (onClose) {
      // Small delay so the user can see the success message briefly
      const t = setTimeout(onClose, 1200);
      return () => clearTimeout(t);
    }
  }, [state, onClose]);

  const showState = state && state !== dismissedState;

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-white/90 p-6 shadow-sm backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#111114]/90">
      <h2 className="mb-5 text-base font-bold text-zinc-950 dark:text-zinc-50">
        {isEditing ? "Modifier la réclamation" : "Nouvelle réclamation"}
      </h2>

      {/* Global feedback */}
      {showState && state && (
        <div
          role="alert"
          aria-live="assertive"
          className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            state.success
              ? state.localDraft
                ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300"
                : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          <span aria-hidden="true">
            {state.success ? (state.localDraft ? "📝" : "✅") : "❌"}
          </span>
          <span className="flex-1">
            {state.localDraft && (
              <span className="mr-2 inline-flex rounded-full bg-blue-200/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-900 dark:bg-blue-900/60 dark:text-blue-200">
                Brouillon local
              </span>
            )}
            {state.message}
          </span>
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => setDismissedState(state)}
            className="ml-auto shrink-0 text-xs opacity-60 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      <form ref={formRef} action={formAction} noValidate className="space-y-4">
        {/* Hidden id for edit mode */}
        {isEditing && (
          <input type="hidden" name="id" value={editTarget._id} />
        )}

        {/* Development-only test apartment selector */}
        {testProperties.length > 0 && (
          <div>
            <label
              htmlFor="complaint-property"
              className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Appartement concerné
            </label>
            <select
              id="complaint-property"
              name="propertyId"
              defaultValue={editTarget?.propertyId ?? ""}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
            >
              <option value="">Aucun appartement (réclamation générale)</option>
              {testProperties.map((property) => (
                <option key={property._id} value={property._id}>
                  {formatTestPropertyCode(property.code)} — {property.label}, {property.city}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-zinc-400">
              Appartements fictifs de développement, limités à ceux que vous
              occupez.
            </p>
            <FieldError errors={state?.errors} field="propertyId" />
          </div>
        )}

        {/* Title */}
        <div>
          <label
            htmlFor="complaint-title"
            className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
          >
            Titre <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <input
            id="complaint-title"
            name="title"
            type="text"
            required
            maxLength={120}
            defaultValue={editTarget?.title ?? ""}
            placeholder="Ex. : Fuite d'eau dans la cuisine"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
            aria-describedby={state?.errors?.title ? "err-title" : undefined}
          />
          <FieldError errors={state?.errors} field="title" />
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="complaint-description"
            className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
          >
            Description du problème{" "}
            <span className="text-red-500" aria-hidden="true">*</span>
          </label>
          <textarea
            id="complaint-description"
            name="description"
            required
            rows={4}
            maxLength={2000}
            defaultValue={editTarget?.description ?? ""}
            placeholder="Décrivez le problème en détail…"
            className="w-full resize-y rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
          />
          <FieldError errors={state?.errors} field="description" />
        </div>

        {/* Category + Priority — side by side on larger screens */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Category */}
          <div>
            <label
              htmlFor="complaint-category"
              className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Catégorie <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="complaint-category"
              name="category"
              required
              defaultValue={editTarget?.category ?? ""}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
            >
              <option value="" disabled>
                Choisir…
              </option>
              {COMPLAINT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            <FieldError errors={state?.errors} field="category" />
          </div>

          {/* Priority */}
          <div>
            <label
              htmlFor="complaint-priority"
              className="mb-1 block text-xs font-semibold text-zinc-700 dark:text-zinc-300"
            >
              Priorité <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <select
              id="complaint-priority"
              name="priority"
              required
              defaultValue={editTarget?.priority ?? "medium"}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
            >
              {COMPLAINT_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
            <FieldError errors={state?.errors} field="priority" />
          </div>
        </div>

        {/* Actions */}
        <div className={`flex gap-3 pt-1 ${isEditing ? "flex-row-reverse" : ""}`}>
          <div className="flex-1">
            <SubmitButton label={isEditing ? "Enregistrer" : "Soumettre la réclamation"} />
          </div>
          {isEditing && onClose && (
            <button
              type="button"
              onClick={onClose}
              id="complaint-cancel-btn"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-zinc-200 bg-white/80 px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Annuler
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
