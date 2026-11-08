import type { Metadata } from "next";
import Link from "next/link";
import SignUpForm from "./SignUpForm";
import ThemeToggle from "../_components/ThemeToggle";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your HomeCheck account to browse and manage properties.",
};

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col items-center justify-center linear-grid px-4 py-16">
      <div className="absolute top-4 right-6 z-10">
        <ThemeToggle />
      </div>

      <main className="w-full max-w-lg">
        <div className="relative rounded-2xl border border-[#DCFCE7] bg-white/95 p-8 shadow-xl shadow-[#166534]/5 backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#111114]/90 dark:shadow-black/50">
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 group"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#166534] text-xs font-bold text-white shadow-xs dark:bg-white dark:text-zinc-950">
                H
              </div>
              <span className="text-sm font-bold tracking-tight text-[#1F2937] dark:text-zinc-50">
                HomeCheck
              </span>
            </Link>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#1F2937] dark:text-zinc-50">
              Rejoignez HomeCheck
            </h1>
            <p className="mt-1.5 text-xs text-[#6B7280] leading-relaxed dark:text-zinc-400">
              Créez votre compte pour explorer les annonces, gérer votre budget ou suivre les interventions de maintenance.
            </p>
          </div>

          <SignUpForm />

          <p className="mt-6 text-center text-xs text-[#6B7280] dark:text-zinc-400">
            Vous avez déjà un compte ?{" "}
            <Link
              href="/login"
              className="font-semibold text-[#166534] hover:underline dark:text-zinc-100"
            >
              Se connecter
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-[#6B7280] dark:text-zinc-400">
          <Link
            href="/"
            className="font-medium hover:text-[#166534] dark:hover:text-zinc-100 transition-colors"
          >
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </main>
    </div>
  );
}
