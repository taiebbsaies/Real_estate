"use client";

import { useEffect } from "react";

type OwnerComplaintsErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function OwnerComplaintsError({
  error,
  retry,
}: OwnerComplaintsErrorProps) {
  useEffect(() => {
    console.error("[owner/complaints]", error);
  }, [error]);

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <span className="text-lg font-semibold tracking-tight text-blue-600 dark:text-blue-400">
            HomeCheck
          </span>
          <span className="text-zinc-400">/</span>
          <span className="text-sm text-zinc-500">Propriétaire</span>
          <span className="text-zinc-400">/</span>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Réclamations
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div
          role="alert"
          className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-900/50 dark:bg-zinc-900"
        >
          <p className="text-3xl" aria-hidden="true">
            ⚠️
          </p>
          <h1 className="mt-3 text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Impossible de charger les statistiques
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Une erreur est survenue pendant la récupération des réclamations.
            Vos données ne sont pas modifiées.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 active:scale-95 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Réessayer
          </button>
        </div>
      </main>
    </div>
  );
}
