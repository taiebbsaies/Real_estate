"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
  searchWithText,
  type NaturalSearchState,
} from "@/app/actions/natural-search";

const EXAMPLES = [
  "villa 3 chambres à Hammamet moins de 1500 DT avec parking",
  "appartement 2 chambres à Tunis",
  "maison avec jardin à Sousse",
];

const initialState: NaturalSearchState = { success: false, message: "" };

export default function NaturalSearchBar() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [state, formAction, pending] = useActionState(
    searchWithText,
    initialState,
  );

  useEffect(() => {
    if (!state.success || state.queryString === undefined) {
      return;
    }

    const href = `/dashboard/tenant/properties?${state.queryString}`;
    // Let the "Compris : ..." summary render briefly before navigating.
    const timer = setTimeout(() => router.push(href), 700);
    return () => clearTimeout(timer);
  }, [state, router]);

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
          Recherche en langage naturel
        </h2>
        <Link
          href="/dashboard/tenant/properties"
          className="text-xs font-semibold text-zinc-500 underline decoration-zinc-300 underline-offset-2 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Effacer les filtres
        </Link>
      </div>

      <form action={formAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="natural-search" className="sr-only">
          Décrivez le logement recherché
        </label>
        <input
          id="natural-search"
          name="text"
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={300}
          placeholder="Ex. : villa 3 chambres à Hammamet moins de 1500 DT avec parking"
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 px-5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          {pending ? "Recherche…" : "Rechercher"}
        </button>
      </form>

      <div className="mt-2 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setText(example)}
            className="rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
          >
            {example}
          </button>
        ))}
      </div>

      {!state.success && state.message && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          {state.message}
        </p>
      )}

      {state.success && state.explanation && (
        <p
          role="status"
          className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <span>
            Compris : {state.explanation.join(" · ")}
          </span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
            {state.source === "ai" ? "IA" : "Règles"}
          </span>
        </p>
      )}
    </section>
  );
}
