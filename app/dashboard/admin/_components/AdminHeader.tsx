import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import ThemeToggle from "@/app/_components/ThemeToggle";

export type AdminHeaderActive = "dashboard" | "properties";

interface AdminHeaderProps {
  active: AdminHeaderActive;
}

export default function AdminHeader({ active }: AdminHeaderProps) {
  const isDashboardActive = active === "dashboard";

  const navLinkClass = (isActive: boolean) =>
    `text-xs font-medium transition-colors ${
      isActive
        ? "font-semibold text-[#166534] dark:text-emerald-300"
        : "text-[#6B7280] hover:text-[#166534] dark:text-zinc-400 dark:hover:text-emerald-300"
    }`;

  const profileLinkClass =
    "text-xs font-medium text-[#6B7280] transition-colors hover:text-[#166534] dark:text-zinc-400 dark:hover:text-emerald-300";

  return (
    <header className="sticky top-0 z-50 border-b border-[#DCFCE7] bg-white/80 backdrop-blur-md dark:border-emerald-500/15 dark:bg-[#060907]/80">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
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
          <span className="text-xs font-semibold text-[#166534] dark:text-emerald-300">
            Administration
          </span>
          {!isDashboardActive && (
            <>
              <span className="text-zinc-300 dark:text-zinc-700">/</span>
              <span className="text-xs font-semibold text-[#166534] dark:text-emerald-300">
                Logements
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <nav
            aria-label="Modules de l'administration"
            className="flex items-center gap-4"
          >
            <Link href="/dashboard/admin" className={navLinkClass(isDashboardActive)}>
              Tableau de bord
            </Link>
            <Link
              href="/dashboard/admin/properties"
              className={navLinkClass(!isDashboardActive)}
            >
              Logements
            </Link>
          </nav>
          <Link href="/profile" className={profileLinkClass}>
            Mon profil
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Déconnexion"
              className="text-xs font-medium text-[#6B7280] transition-colors hover:text-[#166534] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700 dark:text-zinc-400 dark:hover:text-emerald-300 dark:focus-visible:outline-emerald-300"
            >
              Déconnexion
            </button>
          </form>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
