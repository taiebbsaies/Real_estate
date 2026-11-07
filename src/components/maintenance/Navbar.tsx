"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wrench, PlusCircle, BarChart3, Home, Shield, Bell } from "lucide-react";
import { RoleSwitcher } from "./RoleSwitcher";
import { type ActorRole } from "@/src/modules/maintenance/constants";

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

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

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
        <div className="flex items-center gap-6">
          <Link href="/maintenance" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base tracking-tight">HomeCheck</span>
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

        {/* Right Section: Role Switcher & User Avatar */}
        <div className="flex items-center gap-3">
          <RoleSwitcher
            currentRole={user.role}
            userName={`${user.firstName} ${user.lastName}`}
          />

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
