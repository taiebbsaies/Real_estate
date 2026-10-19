"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DashboardIcon, HistoryIcon, ReceiptIcon } from "./icons";

export const TABS = [
  {
    href: "/budget",
    label: "Accueil",
    Icon: DashboardIcon,
    isActive: (pathname: string) => pathname === "/budget",
  },
  {
    href: "/budget/depenses",
    label: "Dépenses",
    Icon: ReceiptIcon,
    isActive: (pathname: string) => pathname.startsWith("/budget/depenses"),
  },
  {
    href: "/budget/historique",
    label: "Historique",
    Icon: HistoryIcon,
    isActive: (pathname: string) => pathname.startsWith("/budget/historique"),
  },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation du module budget"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--budget-border)] bg-[var(--budget-surface)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <div className="mx-auto flex h-16 w-full max-w-[480px] items-stretch">
        {TABS.map(({ href, label, Icon, isActive }) => {
          const active = isActive(pathname);

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-[44px] flex-1 flex-col items-center justify-center gap-1 transition-colors ${
                active
                  ? "text-[var(--budget-primary)]"
                  : "text-[var(--budget-muted)] hover:text-[var(--budget-text)]"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
