"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  name: string;
  href: string;
  icon: (active: boolean) => React.ReactNode;
}

export default function BottomNav() {
  const pathname = usePathname();

  // Hide bottom bar on auth pages to avoid virtual keyboard overlap
  if (pathname === "/login" || pathname === "/signup") {
    return null;
  }

  const items: NavItem[] = [
    {
      name: "Accueil",
      href: "/",
      icon: (active) => (
        <svg
          className={`h-5 w-5 transition-transform duration-200 ${
            active ? "scale-110" : ""
          }`}
          viewBox="0 0 24 24"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={active ? "1.5" : "2"}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      name: "Budget",
      href: "/budget",
      icon: (active) => (
        <svg
          className={`h-5 w-5 transition-transform duration-200 ${
            active ? "scale-110" : ""
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v20" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      name: "Tableau de bord",
      href: "/dashboard/tenant",
      icon: (active) => (
        <svg
          className={`h-5 w-5 transition-transform duration-200 ${
            active ? "scale-110" : ""
          }`}
          viewBox="0 0 24 24"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={active ? "1.5" : "2"}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      ),
    },
    {
      name: "Profil",
      href: "/profile",
      icon: (active) => (
        <svg
          className={`h-5 w-5 transition-transform duration-200 ${
            active ? "scale-110" : ""
          }`}
          viewBox="0 0 24 24"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={active ? "1.5" : "2"}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
  ];

  return (
    <nav
      aria-label="Navigation mobile principale"
      className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-[#DCFCE7] bg-white/90 backdrop-blur-xl shadow-lg shadow-[#166534]/10 pb-[env(safe-area-inset-bottom)] dark:border-emerald-500/15 dark:bg-[#060907]/90 dark:shadow-black/60"
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex flex-col items-center justify-center flex-1 py-1.5 transition-all duration-200 active:scale-95 ${
                isActive
                  ? "text-[#166534] dark:text-emerald-400 font-semibold"
                  : "text-[#6B7280] hover:text-[#1F2937] dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {/* Active top glow indicator pill */}
              {isActive && (
                <span className="absolute -top-1.5 h-1 w-8 rounded-full bg-[#166534] dark:bg-emerald-400 dark:shadow-[0_0_12px_2px_rgba(34,197,94,0.6)]" />
              )}

              <div className="relative">
                {item.icon(isActive)}
              </div>

              <span className="mt-1 text-[10px] tracking-tight truncate max-w-[70px]">
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
