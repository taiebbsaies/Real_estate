import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { signOut } from "@/app/actions/auth";

const roleLabels: Record<string, string> = {
  TENANT: "Locataire",
  OWNER: "Propriétaire",
  TECHNICIAN: "Technicien",
  ADMIN: "Administrateur",
};

async function UserNav() {
  const session = await getSession();

  if (session) {
    const roleDashboardMap: Record<string, string> = {
      TENANT: "/dashboard/tenant",
      OWNER: "/dashboard/owner",
      TECHNICIAN: "/dashboard/technician",
      ADMIN: "/dashboard/admin",
    };
    const dashboardUrl = roleDashboardMap[session.activeRole] || "/dashboard/tenant";

    return (
      <div className="flex items-center gap-3">
        <Link
          href={dashboardUrl}
          className="rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Tableau de bord
        </Link>
        <Link
          href="/profile"
          className="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Profil
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Déconnexion
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/login"
        className="px-3 py-2 text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="rounded-full bg-zinc-900 px-4 py-2 text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        Sign up
      </Link>
    </>
  );
}

async function UserBanner() {
  const session = await getSession();

  if (session) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-600 dark:bg-blue-950 dark:text-blue-400">
          {session.firstName.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Connecté en tant que {roleLabels[session.activeRole] ?? session.activeRole}
          </p>
          <p className="text-xs text-zinc-500">{session.email}</p>
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/signup"
      className="inline-flex h-12 items-center justify-center rounded-full bg-zinc-900 px-8 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
    >
      Get started — it&apos;s free
    </Link>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-full flex-1 flex-col linear-grid bg-[var(--background)] text-[var(--foreground)]">
      {/* Modern Top Blur Navigation */}
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/75 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#08080a]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white shadow-sm dark:bg-white dark:text-zinc-900">
                H
              </div>
              <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                HomeCheck
              </span>
            </Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              PWA Online
            </span>
          </div>

          <nav className="flex items-center gap-3 text-sm font-medium">
            <Suspense
              fallback={
                <div className="h-8 w-28 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              }
            >
              <UserNav />
            </Suspense>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24">
        {/* Subtle pill banner */}
        <div className="flex justify-center sm:justify-start">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1 text-xs font-medium text-zinc-700 shadow-xs dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-300">
            <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
              NOUVEAU
            </span>
            <span>Algorithme de matching locataire & technicien</span>
            <span className="text-zinc-400">→</span>
          </div>
        </div>

        {/* Main Hero Header */}
        <div className="mt-8 max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-6xl dark:text-zinc-50">
            La gestion locative intelligente,{" "}
            <span className="bg-gradient-to-r from-zinc-950 via-zinc-600 to-zinc-400 bg-clip-text text-transparent dark:from-white dark:via-zinc-300 dark:to-zinc-500">
              simplifiée de bout en bout.
            </span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-2xl">
            HomeCheck connecte locataires, propriétaires et techniciens dans une Progressive Web App unique : matching prédictif, état des lieux numérique assisté par IA et suivi en direct des maintenances.
          </p>
        </div>

        {/* Interactive Search Mockup / Quick Action Bar */}
        <div className="mt-10 max-w-4xl rounded-2xl border border-zinc-200 bg-white p-3 shadow-lg shadow-zinc-950/5 dark:border-zinc-800 dark:bg-[#111114] dark:shadow-black/40">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="border-b border-zinc-100 px-3 py-2 sm:border-b-0 sm:border-r sm:border-zinc-100 dark:border-zinc-800/80">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Localisation
              </label>
              <input
                type="text"
                placeholder="Tunis, La Marsa, Sousse..."
                className="mt-1 w-full bg-transparent text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
                readOnly
                defaultValue="Tunis & Banlieue Nord"
              />
            </div>

            <div className="border-b border-zinc-100 px-3 py-2 sm:border-b-0 sm:border-r sm:border-zinc-100 dark:border-zinc-800/80">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Type de bien
              </label>
              <select className="mt-1 w-full bg-transparent text-sm font-medium text-zinc-900 focus:outline-none dark:text-zinc-100">
                <option>Appartement S+2</option>
                <option>Villa / Maison</option>
                <option>Studio meublé</option>
              </select>
            </div>

            <div className="px-3 py-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Budget Max
              </label>
              <input
                type="text"
                placeholder="Ex: 1 500 DT"
                className="mt-1 w-full bg-transparent text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
                readOnly
                defaultValue="1 800 DT / mois"
              />
            </div>

            <div className="flex items-center">
              <Link
                href="/signup"
                className="flex h-11 w-full items-center justify-center rounded-xl bg-zinc-900 text-sm font-semibold text-white transition-all hover:bg-zinc-800 active:scale-98 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100"
              >
                Calculer le match
              </Link>
            </div>
          </div>
        </div>

        {/* Action Buttons & Session state */}
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Suspense
            fallback={
              <div className="h-11 w-44 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
            }
          >
            <UserBanner />
          </Suspense>

          <Link
            href="/db-check"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-300/80 bg-white/60 px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-white hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
          >
            État de la base (MongoDB)
          </Link>
        </div>

        {/* Feature Grid with Swiss/Linear Cards */}
        <div className="mt-20 border-t border-zinc-200/80 pt-16 dark:border-zinc-800/80">
          <div className="mb-8">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Une plateforme unique pour tout le cycle locatif
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Conçu pour fluidifier chaque étape selon le cahier des charges HomeCheck.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {/* Locataire Card */}
            <div className="linear-card rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#111114]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-sm">
                01
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Matching Intelligent Locataire
              </h3>
              <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                Score de compatibilité basé sur le budget, superficie, géolocalisation et préférences avec explications détaillées.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span>Score moyen 91%</span>
                <span className="text-zinc-400">•</span>
                <span>Filtres multicritères</span>
              </div>
            </div>

            {/* Propriétaire Card */}
            <div className="linear-card rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#111114]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                02
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Gestion des Logements & États des Lieux
              </h3>
              <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                Inventaire numérique structuré par pièces (Salon, Cuisine, SDB) et historique des incidents horodaté.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <span>Rapport PDF exportable</span>
                <span className="text-zinc-400">•</span>
                <span>Identité du logement</span>
              </div>
            </div>

            {/* Technicien Card */}
            <div className="linear-card rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-[#111114]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-sm">
                03
              </div>
              <h3 className="mt-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                Réseau de Techniciens & Maintenance
              </h3>
              <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
                Assignation ciblée des interventions par compétences (Plomberie, Électricité, etc.), devis et photos avant/après.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-purple-600 dark:text-purple-400">
                <span>Suivi d&apos;intervention</span>
                <span className="text-zinc-400">•</span>
                <span>Diagnostics & Coûts</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
