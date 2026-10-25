import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your HomeCheck account to manage your rentals and inspections.",
};

export default function LoginPage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center linear-grid px-4 py-16">
      <main className="w-full max-w-md">
        <div className="relative rounded-2xl border border-zinc-200/90 bg-white/90 p-8 shadow-xl shadow-zinc-950/5 backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#111114]/90 dark:shadow-black/50">
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 group"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950 text-xs font-bold text-white shadow-xs dark:bg-white dark:text-zinc-950">
                H
              </div>
              <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                HomeCheck
              </span>
            </Link>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Bon retour parmi nous
            </h1>
            <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">
              Connectez-vous pour accéder à vos inspections, annonces et interventions.
            </p>
          </div>

          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>

          <p className="mt-6 text-center text-xs text-zinc-500">
            Vous n&apos;avez pas de compte ?{" "}
            <Link
              href="/signup"
              className="font-semibold text-zinc-950 hover:underline dark:text-zinc-100"
            >
              Créer un compte
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-zinc-500">
          <Link
            href="/"
            className="font-medium hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </main>
    </div>
  );
}
