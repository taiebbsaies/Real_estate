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
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-lg font-semibold tracking-tight text-blue-600 dark:text-blue-400">
              HomeCheck
            </Link>
            <span className="text-zinc-400">/</span>
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              Espace Locataire
            </span>
          </div>
          <Link
            href="/profile"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Mon Profil
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Bonjour, {session.firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Retrouvez vos critères de recherche, vos recommandations et vos demandes de maintenance.
          </p>
        </div>

        {/* Dashboard Grid (Sections 22) */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Matching
            </span>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">12</p>
            <p className="mt-1 text-xs text-zinc-500">Logements recommandés (IA)</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-semibold uppercase tracking-wider text-green-600 dark:text-green-400">
              Favoris
            </span>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">3</p>
            <p className="mt-1 text-xs text-zinc-500">Logements sauvegardés</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Inspections
            </span>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">1</p>
            <p className="mt-1 text-xs text-zinc-500">État des lieux numérique</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Maintenance
            </span>
            <p className="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">0</p>
            <p className="mt-1 text-xs text-zinc-500">Demandes en cours</p>
          </div>
        </div>
      </main>
    </div>
  );
}
