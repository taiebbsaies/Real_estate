import Link from "next/link";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TechnicianDashboardPage() {
  const session = await getSession();

  if (!session || (session.activeRole !== "TECHNICIAN" && session.activeRole !== "ADMIN")) {
    redirect("/login");
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold tracking-tight text-blue-600 dark:text-blue-400">
              HomeCheck
            </Link>
            <span className="text-zinc-400">/</span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Espace Technicien
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/technician/complaints"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Réclamations
            </Link>
            <Link
              href="/profile"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              Mon Profil
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Bonjour, {session.firstName} 🛠️
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Consultez les demandes d&apos;intervention compatibles, acceptez des missions et clôturez vos réparations.
          </p>
        </div>

        {/* Dashboard Grid (Section 24) */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Disponibles
            </span>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">5</p>
            <p className="mt-1 text-xs text-zinc-500">Missions à proximité (Matching)</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              En cours
            </span>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">2</p>
            <p className="mt-1 text-xs text-zinc-500">Interventions acceptées</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Terminées
            </span>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">14</p>
            <p className="mt-1 text-xs text-zinc-500">Réparations effectuées</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Évaluation
            </span>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">4.9 / 5</p>
            <p className="mt-1 text-xs text-zinc-500">Basé sur 12 avis</p>
          </div>

          {/* Complaints shortcut */}
          <Link
            href="/dashboard/technician/complaints"
            className="col-span-full rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600 sm:col-span-2 lg:col-span-1"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Réclamations
            </span>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">→</p>
            <p className="mt-1 text-xs text-zinc-500">Voir les interventions</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
