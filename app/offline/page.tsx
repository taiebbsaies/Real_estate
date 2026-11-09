import type { Metadata } from "next";
import Logo from "@/app/_components/Logo";
import Link from "next/link";
import ThemeToggle from "@/app/_components/ThemeToggle";
import OfflineMessage from "./OfflineMessage";

export const metadata: Metadata = {
  title: "Hors ligne",
};

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/budget", label: "Budget" },
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/profile", label: "Profil" },
];

// App shell served by the service worker: the navigation stays, and the content is replaced by a message.
// The fixed bottom navigation comes from the root layout on phones.
export default function OfflinePage() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col md:min-h-dvh">
      <header className="border-b border-[#DCFCE7] bg-white dark:border-emerald-500/15 dark:bg-[#0c1410]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <nav aria-label="Navigation principale" className="hidden items-center gap-4 md:flex">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs font-medium text-[#6B7280] hover:text-[#166534] dark:text-zinc-400 dark:hover:text-emerald-300"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <OfflineMessage />
    </div>
  );
}
