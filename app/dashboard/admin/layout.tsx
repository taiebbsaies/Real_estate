import type { Metadata } from "next";
import Link from "next/link";
import ThemeToggle from "@/app/_components/ThemeToggle";
import { requireAdminPage } from "./_components/guard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Administration — HomeCheck",
};

const LINKS = [
  { href: "/dashboard/admin", label: "Aperçu" },
  { href: "/dashboard/admin/users", label: "Utilisateurs" },
  { href: "/dashboard/admin/technicians", label: "Techniciens" },
  { href: "/dashboard/admin/maintenance", label: "Maintenance" },
  { href: "/maintenance/admin", label: "Statistiques & catégories" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();

  return (
    <div className="min-h-full bg-[var(--background)] text-[var(--foreground)]">
      <header className="border-b border-[#DCFCE7] bg-white dark:border-emerald-500/15 dark:bg-[#0c1410]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-sm font-bold text-[#1F2937] dark:text-zinc-50">
            <Link href="/">HomeCheck</Link>
            <span className="font-normal text-[#6B7280] dark:text-zinc-400">/ Administration</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="text-xs font-medium text-[#6B7280] hover:text-[#166534] dark:text-zinc-400 dark:hover:text-emerald-300"
            >
              Mon profil
            </Link>
            <ThemeToggle />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-4 overflow-x-auto px-4 pb-3 sm:px-6">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-xs font-semibold text-[#166534] hover:underline dark:text-emerald-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
