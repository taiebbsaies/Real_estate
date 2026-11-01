import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getMyComplaints } from "@/lib/complaints/queries";
import ThemeToggle from "@/app/_components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function TenantDashboardPage() {
  const session = await getSession();

  if (!session || (session.activeRole !== "TENANT" && session.activeRole !== "ADMIN")) {
    redirect("/login");
  }

  const complaints = await getMyComplaints();
  const openComplaints = complaints.filter(
    (complaint) => complaint.status === "pending" || complaint.status === "in_progress",
  ).length;

  return (
    <div className="relative min-h-full flex-1 flex-col linear-grid overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Ambient Radial Lights (Dark Emerald Atmosphere) */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[130px] dark:bg-emerald-500/20" />
      <div className="pointer-events-none absolute top-1/3 -right-28 -z-10 h-[400px] w-[500px] rounded-full bg-emerald-600/5 blur-[140px] dark:bg-emerald-600/15" />

      {/* Modern Top Blur Navigation */}
      <header className="sticky top-0 z-40 border-b border-[#DCFCE7] bg-white/80 backdrop-blur-md dark:border-emerald-500/15 dark:bg-[#060907]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#166534] text-xs font-bold text-white shadow-sm dark:bg-emerald-500 dark:text-zinc-950 dark:shadow-[0_0_15px_-2px_rgba(34,197,94,0.5)]">
                H
              </div>
              <span className="text-sm font-bold tracking-tight text-[#1F2937] dark:text-zinc-50">
                HomeCheck
              </span>
            </Link>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-semibold text-[#166534] dark:bg-emerald-950/70 dark:text-emerald-300 dark:border dark:border-emerald-500/30">
              Espace Locataire
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard/tenant/complaints"
              className="text-xs font-medium text-[#6B7280] hover:text-[#166534] dark:text-zinc-400 dark:hover:text-emerald-300 transition-colors"
            >
              Mes réclamations
            </Link>
            <Link
              href="/budget"
              className="text-xs font-medium text-[#6B7280] hover:text-[#166534] dark:text-zinc-400 dark:hover:text-emerald-300 transition-colors"
            >
              Mon budget
            </Link>
            <Link
              href="/profile"
              className="text-xs font-medium text-[#6B7280] hover:text-[#166534] dark:text-zinc-400 dark:hover:text-emerald-300 transition-colors"
            >
              Paramètres
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DCFCE7] bg-[#DCFCE7]/70 px-3 py-0.5 text-xs font-medium text-[#166534] dark:border-emerald-500/30 dark:bg-emerald-950/60 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              Bail en cours &amp; Dossier certifié
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1F2937] dark:text-zinc-50">
              Bonjour, {session.firstName} 👋
            </h1>
            <p className="mt-1 text-xs text-[#6B7280] dark:text-zinc-400">
              Compte : <strong className="text-[#1F2937] dark:text-zinc-200">{session.firstName} {session.lastName}</strong> ({session.email})
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/profile"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[#DCFCE7] bg-white/80 px-4 text-xs font-semibold text-[#1F2937] shadow-xs hover:bg-[#F0FDF4] dark:border-emerald-500/20 dark:bg-[#0c1410] dark:text-zinc-200 dark:hover:bg-[#121c16] transition-all"
            >
              Modifier mes critères
            </Link>
            <Link
              href="/"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-[#166534] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#14532d] active:scale-98 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 dark:shadow-[0_0_20px_-3px_rgba(34,197,94,0.4)] transition-all"
            >
              Rechercher un logement
            </Link>
          </div>
        </div>

        {/* Linear KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* KPI 1 */}
          <div className="linear-card rounded-2xl border border-[#DCFCE7] bg-white/90 p-5 shadow-sm shadow-[#166534]/5 backdrop-blur-md dark:border-emerald-500/15 dark:bg-[#0c1410]/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-emerald-400/80">
                Matching IA
              </span>
              <span className="flex h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#1F2937] dark:text-zinc-50">12</p>
            <p className="mt-1 text-xs text-[#6B7280] dark:text-zinc-400">Logements compatibles trouvés</p>
          </div>

          {/* KPI 2 */}
          <div className="linear-card rounded-2xl border border-[#DCFCE7] bg-white/90 p-5 shadow-sm shadow-[#166534]/5 backdrop-blur-md dark:border-emerald-500/15 dark:bg-[#0c1410]/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-emerald-400/80">
                Favoris
              </span>
              <span className="text-xs font-semibold text-rose-500">♥</span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#1F2937] dark:text-zinc-50">3</p>
            <p className="mt-1 text-xs text-[#6B7280] dark:text-zinc-400">Biens sauvegardés</p>
          </div>

          {/* KPI 3 */}
          <div className="linear-card rounded-2xl border border-[#DCFCE7] bg-white/90 p-5 shadow-sm shadow-[#166534]/5 backdrop-blur-md dark:border-emerald-500/15 dark:bg-[#0c1410]/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-emerald-400/80">
                État des lieux
              </span>
              <span className="rounded-md bg-[#DCFCE7] px-1.5 py-0.5 text-[10px] font-bold text-[#166534] dark:bg-emerald-950 dark:text-emerald-300">
                PDF
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#1F2937] dark:text-zinc-50">1</p>
            <p className="mt-1 text-xs text-[#6B7280] dark:text-zinc-400">Inspection numérique validée</p>
          </div>

          {/* KPI 4 */}
          <Link
            href="/dashboard/tenant/complaints"
            className="linear-card group block rounded-2xl border border-[#DCFCE7] bg-white/90 p-5 shadow-sm shadow-[#166534]/5 backdrop-blur-md dark:border-emerald-500/15 dark:bg-[#0c1410]/80"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-emerald-400/80">
                Réclamations
              </span>
              <span className="text-xs font-semibold text-[#22C55E] group-hover:translate-x-1 transition-transform">→</span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#1F2937] dark:text-zinc-50">
              {complaints.length}
            </p>
            <p className="mt-1 text-xs text-[#6B7280] dark:text-zinc-400">
              {openComplaints > 0
                ? `${openComplaints} en cours de traitement`
                : "Voir mes réclamations"}
            </p>
          </Link>
        </div>

        {/* Section matching preview with rich cards */}
        <div className="mt-10 rounded-2xl border border-[#DCFCE7] bg-white/90 p-6 shadow-sm shadow-[#166534]/5 backdrop-blur-md dark:border-emerald-500/15 dark:bg-[#0c1410]/85">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#DCFCE7] dark:border-emerald-500/15 gap-2">
            <div>
              <h2 className="text-lg font-bold text-[#1F2937] dark:text-zinc-50">
                Recommandations récentes (Matching IA)
              </h2>
              <p className="mt-0.5 text-xs text-[#6B7280] dark:text-zinc-400">
                Classés selon vos critères de recherche enregistrés dans votre profil.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-bold text-[#166534] dark:bg-emerald-950/70 dark:text-emerald-300 dark:border dark:border-emerald-500/30">
              <span>⚡</span> Algorithme multicritère actif
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#DCFCE7] bg-[#F0FDF4]/50 p-4.5 dark:border-emerald-500/15 dark:bg-[#070c09]/80 transition-all hover:border-[#166534]/40 dark:hover:border-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#1F2937] dark:text-zinc-100">
                  Appartement S+2 Haut Standing
                </span>
                <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-bold text-[#166534] dark:bg-emerald-950 dark:text-emerald-300">
                  94% compatible ✨
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[#6B7280] dark:text-zinc-400">
                La Marsa Plage • <strong className="text-[#166534] dark:text-emerald-400">1 650 DT / mois</strong> • 95 m²
              </p>
              
              <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div className="h-full w-[94%] rounded-full bg-gradient-to-r from-[#166534] to-[#22C55E] dark:from-emerald-500 dark:to-emerald-300" />
              </div>

              <div className="mt-3 flex items-center gap-2 text-[11px] text-[#6B7280] dark:text-zinc-400">
                <span className="text-[#22C55E] font-medium">✓ Budget 100%</span>
                <span>•</span>
                <span>Localisation 95%</span>
                <span>•</span>
                <span>Chambres 100%</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#DCFCE7] bg-[#F0FDF4]/50 p-4.5 dark:border-emerald-500/15 dark:bg-[#070c09]/80 transition-all hover:border-[#166534]/40 dark:hover:border-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#1F2937] dark:text-zinc-100">
                  Studio moderne meublé
                </span>
                <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-xs font-bold text-[#166534] dark:bg-emerald-950 dark:text-emerald-300">
                  88% compatible ✨
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[#6B7280] dark:text-zinc-400">
                Les Berges du Lac 2 • <strong className="text-[#166534] dark:text-emerald-400">1 300 DT / mois</strong> • 55 m²
              </p>

              <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-[#166534] to-[#22C55E] dark:from-emerald-500 dark:to-emerald-300" />
              </div>

              <div className="mt-3 flex items-center gap-2 text-[11px] text-[#6B7280] dark:text-zinc-400">
                <span className="text-[#22C55E] font-medium">✓ Budget 100%</span>
                <span>•</span>
                <span>Parking inclus</span>
                <span>•</span>
                <span>Ascenseur</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
