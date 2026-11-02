import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getAllComplaints } from "@/lib/complaints/queries";
import ThemeToggle from "@/app/_components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function TechnicianDashboardPage() {
  const session = await getSession();

  if (!session || (session.activeRole !== "TECHNICIAN" && session.activeRole !== "ADMIN")) {
    redirect("/login");
  }

  const complaints = await getAllComplaints();
  const activeComplaints = complaints.filter(
    (complaint) =>
      complaint.status === "pending" || complaint.status === "in_progress",
  ).length;

  return (
    <div className="relative min-h-full flex-1 flex-col linear-grid overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      {/* Ambient Radial Lights */}
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
              Espace Technicien
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/dashboard/technician/complaints"
              className="text-xs font-medium text-[#6B7280] hover:text-[#166534] dark:text-zinc-400 dark:hover:text-emerald-300 transition-colors"
            >
              Missions &amp; Réclamations
              {activeComplaints > 0 && (
                <span className="ml-1.5 rounded-full bg-[#166534] dark:bg-emerald-500 px-1.5 py-0.2 text-[10px] font-bold text-white dark:text-zinc-950">
                  {activeComplaints}
                </span>
              )}
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
              Mon Profil
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
              <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-ping" />
              Statut : Disponible pour interventions
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-[#1F2937] dark:text-zinc-50">
              Bonjour, {session.firstName} 🛠️
            </h1>
            <p className="mt-1 text-xs text-[#6B7280] dark:text-zinc-400">
              Consultez les demandes d&apos;intervention compatibles, envoyez vos devis et clôturez vos réparations.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/profile"
              className="inline-flex h-9 items-center justify-center rounded-xl border border-[#DCFCE7] bg-white/80 px-4 text-xs font-semibold text-[#1F2937] shadow-xs hover:bg-[#F0FDF4] dark:border-emerald-500/20 dark:bg-[#0c1410] dark:text-zinc-200 dark:hover:bg-[#121c16] transition-all"
            >
              Mes compétences &amp; zone
            </Link>
            <Link
              href="/dashboard/technician/complaints"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-[#166534] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[#14532d] active:scale-98 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 dark:shadow-[0_0_20px_-3px_rgba(34,197,94,0.4)] transition-all"
            >
              Voir les missions disponibles
            </Link>
          </div>
        </div>

        {/* Linear KPI Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="linear-card rounded-2xl border border-[#DCFCE7] bg-white/90 p-5 shadow-sm shadow-[#166534]/5 backdrop-blur-md dark:border-emerald-500/15 dark:bg-[#0c1410]/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-emerald-400/80">
                Disponibles
              </span>
              <span className="flex h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#1F2937] dark:text-zinc-50">5</p>
            <p className="mt-1 text-xs text-[#6B7280] dark:text-zinc-400">Missions à proximité (Matching)</p>
          </div>

          <div className="linear-card rounded-2xl border border-[#DCFCE7] bg-white/90 p-5 shadow-sm shadow-[#166534]/5 backdrop-blur-md dark:border-emerald-500/15 dark:bg-[#0c1410]/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-emerald-400/80">
                En cours
              </span>
              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Actif
              </span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#1F2937] dark:text-zinc-50">2</p>
            <p className="mt-1 text-xs text-[#6B7280] dark:text-zinc-400">Interventions acceptées</p>
          </div>

          <div className="linear-card rounded-2xl border border-[#DCFCE7] bg-white/90 p-5 shadow-sm shadow-[#166534]/5 backdrop-blur-md dark:border-emerald-500/15 dark:bg-[#0c1410]/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-emerald-400/80">
                Terminées
              </span>
              <span className="text-xs font-bold text-[#166534] dark:text-emerald-400">✓ Validées</span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#1F2937] dark:text-zinc-50">14</p>
            <p className="mt-1 text-xs text-[#6B7280] dark:text-zinc-400">Réparations clôturées</p>
          </div>

          <div className="linear-card rounded-2xl border border-[#DCFCE7] bg-white/90 p-5 shadow-sm shadow-[#166534]/5 backdrop-blur-md dark:border-emerald-500/15 dark:bg-[#0c1410]/80">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280] dark:text-emerald-400/80">
                Évaluation
              </span>
              <span className="text-xs text-amber-400 font-bold">⭐ 4.9</span>
            </div>
            <p className="mt-3 text-3xl font-extrabold tracking-tight text-[#1F2937] dark:text-zinc-50">4.9 / 5</p>
            <p className="mt-1 text-xs text-[#6B7280] dark:text-zinc-400">Basé sur 12 avis vérifiés</p>
          </div>
        </div>

        {/* Missions en direct */}
        <div className="mt-10 rounded-2xl border border-[#DCFCE7] bg-white/90 p-6 shadow-sm shadow-[#166534]/5 backdrop-blur-md dark:border-emerald-500/15 dark:bg-[#0c1410]/85">
          <div className="flex items-center justify-between pb-4 border-b border-[#DCFCE7] dark:border-emerald-500/15">
            <div>
              <h2 className="text-lg font-bold text-[#1F2937] dark:text-zinc-50">
                Missions prioritaires à proximité
              </h2>
              <p className="mt-0.5 text-xs text-[#6B7280] dark:text-zinc-400">
                Tickets ouverts correspondant à vos spécialités et votre rayon d&apos;intervention.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-3 py-1 text-xs font-bold text-[#166534] dark:bg-emerald-950/70 dark:text-emerald-300 dark:border dark:border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              Matching instantané actif
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#DCFCE7] bg-[#F0FDF4]/50 p-4 dark:border-emerald-500/15 dark:bg-[#070c09]/80">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1F2937] dark:text-zinc-100">
                  <span>🚰</span> Fuite d&apos;eau sous évier
                </span>
                <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  Urgent (SLA &lt; 2h)
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[#6B7280] dark:text-zinc-400">
                La Marsa Plage (à 3.2 km) • Appartement S+2
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#6B7280] dark:text-zinc-400 pt-2 border-t border-[#DCFCE7]/60 dark:border-emerald-500/10">
                <span>Fourchette tarifaire : 50 - 90 DT</span>
                <span className="text-[#166534] dark:text-emerald-400 font-bold hover:underline cursor-pointer">
                  Accepter la mission →
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-[#DCFCE7] bg-[#F0FDF4]/50 p-4 dark:border-emerald-500/15 dark:bg-[#070c09]/80">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#1F2937] dark:text-zinc-100">
                  <span>⚡</span> Panne disjoncteur différentiel
                </span>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  Priorité Normale
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[#6B7280] dark:text-zinc-400">
                Carthage Byrsa (à 5.8 km) • Villa
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#6B7280] dark:text-zinc-400 pt-2 border-t border-[#DCFCE7]/60 dark:border-emerald-500/10">
                <span>Fourchette tarifaire : 70 - 120 DT</span>
                <span className="text-[#166534] dark:text-emerald-400 font-bold hover:underline cursor-pointer">
                  Accepter la mission →
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
