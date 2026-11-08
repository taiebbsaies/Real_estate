import { Suspense } from "react";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { signOut } from "@/app/actions/auth";
import ThemeToggle from "./_components/ThemeToggle";

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
    const initial = session.firstName.charAt(0).toUpperCase();

    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Link
          href={dashboardUrl}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[#1F2937] transition-colors hover:bg-[#DCFCE7] hover:text-[#166534] dark:text-zinc-300 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
          <span className="hidden md:inline">Tableau de bord</span>
        </Link>
        <Link
          href="/budget"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[#1F2937] transition-colors hover:bg-[#DCFCE7] hover:text-[#166534] dark:text-zinc-300 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v20" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span className="hidden md:inline">Budget</span>
        </Link>
        <Link
          href="/maintenance"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-[#1F2937] transition-colors hover:bg-[#DCFCE7] hover:text-[#166534] dark:text-zinc-300 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <span className="hidden md:inline">Maintenance</span>
        </Link>
        <Link
          href="/profile"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#166534] text-xs font-bold text-white transition-opacity hover:opacity-90 dark:bg-emerald-500 dark:text-zinc-950 dark:shadow-[0_0_15px_-3px_rgba(34,197,94,0.4)]"
          title="Mon profil"
        >
          {initial}
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            title="Déconnexion"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#DCFCE7] hover:text-[#166534] dark:text-zinc-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </form>

        {/* Change theme button to the right of logout button */}
        <ThemeToggle />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="px-3 py-2 text-sm font-medium text-[#1F2937] transition-colors hover:text-[#166534] dark:text-zinc-300 dark:hover:text-emerald-300"
      >
        Sign in
      </Link>
      <Link
        href="/signup"
        className="rounded-full bg-[#166534] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#14532d] dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 dark:shadow-[0_0_20px_-3px_rgba(34,197,94,0.4)]"
      >
        Sign up
      </Link>
      <ThemeToggle />
    </div>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-full flex-1 flex-col linear-grid overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Ambient Radial Lights (Linear/Vercel Dark Emerald Atmosphere) */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[580px] w-[950px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[130px] dark:bg-emerald-500/20" />
      <div className="pointer-events-none absolute top-1/4 -right-32 -z-10 h-[500px] w-[550px] rounded-full bg-emerald-600/5 blur-[150px] dark:bg-emerald-600/15" />
      <div className="pointer-events-none absolute top-1/2 -left-32 -z-10 h-[450px] w-[500px] rounded-full bg-teal-500/5 blur-[140px] dark:bg-emerald-950/40" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 -z-10 h-[400px] w-[600px] rounded-full bg-emerald-500/5 blur-[150px] dark:bg-emerald-500/10" />

      {/* Modern Top Blur Navigation */}
      <header className="sticky top-0 z-50 border-b border-[#DCFCE7] bg-white/80 backdrop-blur-md dark:border-emerald-500/15 dark:bg-[#060907]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#166534] text-xs font-bold text-white shadow-sm dark:bg-emerald-500 dark:text-zinc-950 dark:shadow-[0_0_15px_-2px_rgba(34,197,94,0.5)]">
                H
              </div>
              <span className="text-base font-bold tracking-tight text-[#1F2937] dark:text-zinc-50">
                HomeCheck
              </span>
            </Link>
          </div>

          <nav className="flex items-center gap-3 text-sm font-medium">
            <Suspense
              fallback={
                <div className="h-8 w-28 animate-pulse rounded-full bg-[#DCFCE7] dark:bg-emerald-950/60" />
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
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DCFCE7] bg-[#DCFCE7]/70 px-3 py-1 text-xs font-medium text-[#166534] shadow-xs dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300 dark:shadow-[0_0_20px_-3px_rgba(34,197,94,0.25)]">
            <span className="rounded-full bg-[#166534] px-1.5 py-0.5 text-[10px] font-bold text-white dark:bg-emerald-500 dark:text-zinc-950">
              NOUVEAU
            </span>
            <span>Algorithme de matching locataire &amp; technicien</span>
            <span className="text-[#22C55E]">→</span>
          </div>
        </div>

        {/* Main Hero Header */}
        <div className="mt-8 max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1F2937] sm:text-6xl dark:text-zinc-50">
            La gestion locative intelligente,{" "}
            <span className="bg-gradient-to-r from-[#166534] via-[#15803d] to-[#22C55E] bg-clip-text text-transparent dark:from-white dark:via-emerald-100 dark:to-emerald-400">
              simplifiée de bout en bout.
            </span>
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-[#6B7280] dark:text-zinc-400 max-w-2xl">
            HomeCheck connecte locataires, propriétaires et techniciens dans une Progressive Web App unique : matching prédictif, état des lieux numérique assisté par IA et suivi en direct des maintenances.
          </p>
        </div>

        {/* Interactive Search Mockup / Quick Action Bar */}
        <div className="mt-10 max-w-4xl rounded-2xl border border-[#DCFCE7] bg-white p-3 shadow-lg shadow-[#166534]/5 dark:border-emerald-500/20 dark:bg-[#0c1410]/85 dark:backdrop-blur-xl dark:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9),0_0_30px_-5px_rgba(34,197,94,0.12)]">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="border-b border-[#DCFCE7]/80 px-3 py-2 sm:border-b-0 sm:border-r sm:border-[#DCFCE7]/80 dark:border-emerald-500/15">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-emerald-400/80">
                Localisation
              </label>
              <input
                type="text"
                placeholder="Tunis, La Marsa, Sousse..."
                className="mt-1 w-full bg-transparent text-sm font-medium text-[#1F2937] placeholder:text-[#6B7280] focus:outline-none dark:text-zinc-100"
                readOnly
                defaultValue="Tunis & Banlieue Nord"
              />
            </div>

            <div className="border-b border-[#DCFCE7]/80 px-3 py-2 sm:border-b-0 sm:border-r sm:border-[#DCFCE7]/80 dark:border-emerald-500/15">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-emerald-400/80">
                Type de bien
              </label>
              <select className="mt-1 w-full bg-transparent text-sm font-medium text-[#1F2937] focus:outline-none dark:text-zinc-100">
                <option>Appartement S+2</option>
                <option>Villa / Maison</option>
                <option>Studio meublé</option>
              </select>
            </div>

            <div className="px-3 py-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-emerald-400/80">
                Budget Max
              </label>
              <input
                type="text"
                placeholder="Ex: 1 500 DT"
                className="mt-1 w-full bg-transparent text-sm font-medium text-[#1F2937] placeholder:text-[#6B7280] focus:outline-none dark:text-zinc-100"
                readOnly
                defaultValue="1 800 DT / mois"
              />
            </div>

            <div className="flex items-center">
              <Link
                href="/signup"
                className="flex h-11 w-full items-center justify-center rounded-xl bg-[#166534] text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#14532d] active:scale-98 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 dark:shadow-[0_0_25px_-5px_rgba(34,197,94,0.45)]"
              >
                Calculer le match
              </Link>
            </div>
          </div>
        </div>

        {/* Feature Grid with Swiss/Linear Cards */}
        <div className="mt-20 border-t border-[#DCFCE7] pt-16 dark:border-emerald-500/15">
          <div className="mb-8">
            <h2 className="text-xl font-bold tracking-tight text-[#1F2937] dark:text-zinc-50">
              Une plateforme unique pour tout le cycle locatif
            </h2>
            <p className="mt-1 text-sm text-[#6B7280] dark:text-zinc-400">
              Conçu pour fluidifier chaque étape selon le cahier des charges HomeCheck.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {/* Locataire Card */}
            <div className="linear-card group relative flex flex-col justify-between rounded-2xl border border-[#DCFCE7] bg-white p-6 shadow-sm shadow-[#166534]/5 dark:border-emerald-500/15 dark:bg-[#0c1410]/80 dark:backdrop-blur-md">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCFCE7] text-sm font-bold text-[#166534] dark:bg-emerald-500/15 dark:text-emerald-400 dark:shadow-[0_0_15px_-3px_rgba(34,197,94,0.3)]">
                    01
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-bold text-[#166534] dark:bg-emerald-950/70 dark:text-emerald-300 dark:border dark:border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                    96% Match ✨
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-bold text-[#1F2937] dark:text-zinc-50">
                  Matching Intelligent Locataire
                </h3>
                <p className="mt-1.5 text-xs text-[#6B7280] dark:text-zinc-400 leading-relaxed">
                  Algorithme prédictif multicritères reliant candidats qualifiés et biens idéaux avec transparence totale.
                </p>

                {/* Mini UI Widget */}
                <div className="mt-4 rounded-xl border border-[#DCFCE7] bg-[#F0FDF4]/60 p-3.5 dark:border-emerald-500/15 dark:bg-[#070c09]/80">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#1F2937] dark:text-zinc-200">
                    <span>S+2 Marsa Plage</span>
                    <span className="text-[#166534] dark:text-emerald-400 font-bold">1 650 DT</span>
                  </div>

                  {/* Progress match bar */}
                  <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                    <div className="h-full w-[96%] rounded-full bg-gradient-to-r from-[#166534] to-[#22C55E] dark:from-emerald-500 dark:to-emerald-300" />
                  </div>

                  <div className="mt-2.5 space-y-1 text-[11px] text-[#6B7280] dark:text-zinc-400">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#22C55E] font-bold">✓</span>
                      <span>Budget respecté (-8% sous le plafond)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#22C55E] font-bold">✓</span>
                      <span>Superficie 94m² &amp; balcon vérifiés</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#22C55E] font-bold">✓</span>
                      <span>Dossier certifié &amp; solvable</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between pt-4 border-t border-[#DCFCE7]/70 dark:border-emerald-500/10 text-xs font-semibold text-[#22C55E]">
                <span>Score moyen 91%</span>
                <span className="text-zinc-400 group-hover:translate-x-1 transition-transform">Explorer le matching →</span>
              </div>
            </div>

            {/* Propriétaire Card */}
            <div className="linear-card group relative flex flex-col justify-between rounded-2xl border border-[#DCFCE7] bg-white p-6 shadow-sm shadow-[#166534]/5 dark:border-emerald-500/15 dark:bg-[#0c1410]/80 dark:backdrop-blur-md">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCFCE7] text-sm font-bold text-[#166534] dark:bg-emerald-500/15 dark:text-emerald-400 dark:shadow-[0_0_15px_-3px_rgba(34,197,94,0.3)]">
                    02
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-bold text-[#166534] dark:bg-emerald-950/70 dark:text-emerald-300 dark:border dark:border-emerald-500/30">
                    📄 Certifié Conforme
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-bold text-[#1F2937] dark:text-zinc-50">
                  États des Lieux &amp; Inventaires IA
                </h3>
                <p className="mt-1.5 text-xs text-[#6B7280] dark:text-zinc-400 leading-relaxed">
                  Checklist numérique pièce par pièce, photos horodatées infalsifiables et rapport PDF signé en direct.
                </p>

                {/* Mini UI Widget */}
                <div className="mt-4 rounded-xl border border-[#DCFCE7] bg-[#F0FDF4]/60 p-3.5 dark:border-emerald-500/15 dark:bg-[#070c09]/80">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#1F2937] dark:text-zinc-200">
                    <span>État des lieux d&apos;entrée</span>
                    <span className="text-[10px] text-zinc-400 font-mono">#EDL-2026</span>
                  </div>

                  <div className="mt-2.5 space-y-1.5">
                    <div className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-[11px] shadow-2xs dark:bg-[#0c1410] border border-[#DCFCE7]/60 dark:border-emerald-500/10">
                      <span className="font-medium text-[#1F2937] dark:text-zinc-300">🛋️ Salon &amp; Séjour</span>
                      <span className="rounded-full bg-[#DCFCE7] px-1.5 py-0.5 text-[10px] font-bold text-[#166534] dark:bg-emerald-950 dark:text-emerald-300">Très bon état</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-[11px] shadow-2xs dark:bg-[#0c1410] border border-[#DCFCE7]/60 dark:border-emerald-500/10">
                      <span className="font-medium text-[#1F2937] dark:text-zinc-300">🍳 Cuisine équipée</span>
                      <span className="rounded-full bg-[#DCFCE7] px-1.5 py-0.5 text-[10px] font-bold text-[#166534] dark:bg-emerald-950 dark:text-emerald-300">Conforme (4 photos)</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-[11px] shadow-2xs dark:bg-[#0c1410] border border-[#DCFCE7]/60 dark:border-emerald-500/10">
                      <span className="font-medium text-[#1F2937] dark:text-zinc-300">🚿 Salle d&apos;eau</span>
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">1 observation</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between pt-4 border-t border-[#DCFCE7]/70 dark:border-emerald-500/10 text-xs font-semibold text-[#22C55E]">
                <span>Export PDF instantané</span>
                <span className="text-zinc-400 group-hover:translate-x-1 transition-transform">Gérer mes biens →</span>
              </div>
            </div>

            {/* Technicien Card */}
            <Link
              href="/maintenance"
              className="linear-card group relative flex flex-col justify-between rounded-2xl border border-[#DCFCE7] bg-white p-6 shadow-sm shadow-[#166534]/5 dark:border-emerald-500/15 dark:bg-[#0c1410]/80 dark:backdrop-blur-md hover:border-emerald-500/40 transition-all hover:-translate-y-0.5"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DCFCE7] text-sm font-bold text-[#166534] dark:bg-emerald-500/15 dark:text-emerald-400 dark:shadow-[0_0_15px_-3px_rgba(34,197,94,0.3)]">
                    03
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-bold text-[#166534] dark:bg-emerald-950/70 dark:text-emerald-300 dark:border dark:border-emerald-500/30">
                    <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-ping" />
                    14 En ligne
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-bold text-[#1F2937] dark:text-zinc-50">
                  Réseau de Techniciens &amp; SOS
                </h3>
                <p className="mt-1.5 text-xs text-[#6B7280] dark:text-zinc-400 leading-relaxed">
                  Attribution automatique des tickets par spécialité (plomberie, électricité, serrurerie) avec devis et suivi photo.
                </p>

                {/* Mini UI Widget */}
                <div className="mt-4 rounded-xl border border-[#DCFCE7] bg-[#F0FDF4]/60 p-3.5 dark:border-emerald-500/15 dark:bg-[#070c09]/80">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#1F2937] dark:text-zinc-200">
                    <span className="inline-flex items-center gap-1 text-[#166534] dark:text-emerald-400 font-bold">
                      🔧 Fuite d&apos;eau signalée
                    </span>
                    <span className="text-[10px] text-zinc-400">⏱️ Réponse: 14 min</span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between rounded-lg bg-white p-2 text-xs shadow-2xs dark:bg-[#0c1410] border border-[#DCFCE7]/60 dark:border-emerald-500/10">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#166534] text-[10px] font-bold text-white dark:bg-emerald-500 dark:text-zinc-950">
                        SB
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#1F2937] dark:text-zinc-200">Sami Benali</p>
                        <p className="text-[10px] text-[#6B7280] dark:text-zinc-400">Plombier agréé • ⭐ 4.9</p>
                      </div>
                    </div>
                    <span className="rounded-md bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-bold text-[#166534] dark:bg-emerald-950 dark:text-emerald-300">
                      Assigné
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[10px] text-[#6B7280] dark:text-zinc-400 px-1">
                    <span>Devis estimé : 65 DT</span>
                    <span className="text-[#22C55E] font-medium">✓ Photo requise</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between pt-4 border-t border-[#DCFCE7]/70 dark:border-emerald-500/10 text-xs font-semibold text-[#22C55E]">
                <span>Diagnostics &amp; SLA garantis</span>
                <span className="text-zinc-400 group-hover:translate-x-1 transition-transform">Voir les interventions →</span>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
