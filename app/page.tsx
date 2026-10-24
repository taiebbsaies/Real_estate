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
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              HomeCheck
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              PWA
            </span>
          </div>

          <nav className="flex items-center gap-3 text-sm font-medium">
            <Suspense
              fallback={
                <div className="h-9 w-32 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              }
            >
              <UserNav />
            </Suspense>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Real estate, simplified
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
            Find your next home with confidence
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            HomeCheck helps tenants, owners, and technicians collaborate
            seamlessly for matching, digital inspections, and maintenance requests.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Suspense
              fallback={
                <div className="h-12 w-48 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              }
            >
              <UserBanner />
            </Suspense>
            <Link
              href="/db-check"
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 px-8 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Database status
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
