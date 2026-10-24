import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TenantDashboardPage() {
  const session = await getSession();

  if (!session || (session.activeRole !== "TENANT" && session.activeRole !== "ADMIN")) {
    redirect("/login");
  }

  return (
    <div className="relative min-h-full linear-grid bg-[var(--background)] text-[var(--foreground)]">
      <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/75 backdrop-blur-md dark:border-zinc-800/80 dark:bg-[#08080a]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950 text-xs font-bold text-white shadow-xs dark:bg-white dark:text-zinc-950">
                H
              </div>
              <span className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                HomeCheck
              </span>
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
              Locataire
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Paramètres
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
              Tableau de bord Locataire
            </h1>
            <p className="mt-1 text-xs text-zinc-500">
              Session active : <strong className="text-zinc-900 dark:text-zinc-100">{session.firstName} {session.lastName}</strong> ({session.email})
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/profile"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-zinc-200 bg-white/80 px-4 text-xs font-semibold text-zinc-800 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Modifier mes critères
            </Link>
            <Link
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-zinc-950 px-4 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 active:scale-98 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Rechercher un logement
            </Link>
          </div>
        </div>

        {/* Linear KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="linear-card rounded-2xl border border-zinc-200/90 bg-white/90 p-5 shadow-xs backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#111114]/90">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Matching IA
              </span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">12</p>
            <p className="mt-1 text-xs text-zinc-500">Logements compatibles trouvés</p>
          </div>

          <div className="linear-card rounded-2xl border border-zinc-200/90 bg-white/90 p-5 shadow-xs backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#111114]/90">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Favoris
              </span>
              <span className="text-xs font-semibold text-zinc-400">♥</span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">3</p>
            <p className="mt-1 text-xs text-zinc-500">Biens sauvegardés</p>
          </div>

          <div className="linear-card rounded-2xl border border-zinc-200/90 bg-white/90 p-5 shadow-xs backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#111114]/90">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                État des lieux
              </span>
              <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                PDF
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">1</p>
            <p className="mt-1 text-xs text-zinc-500">Inspection numérique validée</p>
          </div>

          <div className="linear-card rounded-2xl border border-zinc-200/90 bg-white/90 p-5 shadow-xs backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#111114]/90">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Maintenance
              </span>
              <span className="text-xs font-semibold text-emerald-500">À jour</span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">0</p>
            <p className="mt-1 text-xs text-zinc-500">Demandes de réparation en cours</p>
          </div>
        </div>

        {/* Section matching preview */}
        <div className="mt-10 rounded-2xl border border-zinc-200/90 bg-white/90 p-6 shadow-xs backdrop-blur-md dark:border-zinc-800/90 dark:bg-[#111114]/90">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800/80">
            <div>
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
                Recommandations récentes (Matching IA)
              </h2>
              <p className="mt-0.5 text-xs text-zinc-500">
                Classés selon vos critères de recherche enregistrés dans votre profil.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Niveau 1 — Calcul multicritère
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Appartement S+2 Haut Standing
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  94% compatible
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">La Marsa Plage • 1 650 DT / mois • 95 m²</p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-400">
                <span>Budget: 100%</span>
                <span>•</span>
                <span>Localisation: 95%</span>
                <span>•</span>
                <span>Chambres: 100%</span>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Studio moderne meublé
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  88% compatible
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Les Berges du Lac 2 • 1 300 DT / mois • 55 m²</p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-400">
                <span>Budget: 100%</span>
                <span>•</span>
                <span>Parking: Oui</span>
                <span>•</span>
                <span>Ascenseur: Oui</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
