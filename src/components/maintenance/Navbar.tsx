"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench, PlusCircle, BarChart3, Home, Shield, ArrowLeft, UserCheck, Building } from "lucide-react";
import { type ActorRole } from "@/src/modules/maintenance/constants";
import ThemeToggle from "@/app/_components/ThemeToggle";

interface NavbarProps {
  user: {
    id: string;
    role: ActorRole;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
}

const ROLE_BADGES: Record<string, { label: string; icon: typeof Home; className: string }> = {
  TENANT: {
    label: "Locataire",
    icon: Home,
    className: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  OWNER: {
    label: "Propriétaire",
    icon: UserCheck,
    className: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  },
  TECHNICIAN: {
    label: "Technicien",
    icon: Wrench,
    className: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  ADMIN: {
    label: "Administrateur",
    icon: Shield,
    className: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  },
};

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const roleBadge = ROLE_BADGES[user.role] || ROLE_BADGES.TENANT;
  const RoleIcon = roleBadge.icon;

  const links = [
    {
      href: "/maintenance",
      label: "Interventions",
      icon: Wrench,
      active: pathname === "/maintenance",
    },
    {
      href: "/maintenance/requests/new",
      label: "Signaler un problème",
      icon: PlusCircle,
      active: pathname === "/maintenance/requests/new",
      roles: ["TENANT", "ADMIN"],
    },
    {
      href: "/maintenance/properties",
      label: user.role === "ADMIN" ? "Logements" : "Mes logements",
      icon: Building,
      active: pathname === "/maintenance/properties",
      roles: ["OWNER", "ADMIN"],
    },
    {
      href: "/maintenance/admin",
      label: "Métriques & Admin",
      icon: BarChart3,
      active: pathname === "/maintenance/admin",
      roles: ["ADMIN", "OWNER"],
    },
  ];

  const visibleLinks = links.filter((l) => !l.roles || l.roles.includes(user.role));

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Module Indicator */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Back to Home button */}
          <Link
            href="/"
            title="Retour à l'accueil HomeCheck"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-slate-100 border border-slate-700/60 transition-all text-xs font-semibold shadow-xs hover:-translate-x-0.5 group"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400 group-hover:-translate-x-0.5 transition-transform" />
            <span className="hidden sm:inline">Accueil</span>
          </Link>

          <Link href="/maintenance" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 text-base tracking-tight">HomeCheck</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Maintenance
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">PWA Cycle de vie locatif</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    link.active
                      ? "bg-slate-800 text-blue-400 border border-slate-700 font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section: role of the signed-in user (read-only) & avatar */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm ${roleBadge.className}`}
            title={`Connecté en tant que ${roleBadge.label}`}
          >
            <RoleIcon className="w-3.5 h-3.5" />
            <span>{roleBadge.label}</span>
            <span className="text-[10px] opacity-75 hidden md:inline">
              ({user.firstName} {user.lastName})
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-800">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.firstName}
                className="w-8 h-8 rounded-full object-cover border border-slate-700"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-300 border border-slate-700">
                {user.firstName[0]}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
