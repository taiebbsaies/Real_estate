"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Shield, Home, Wrench, ChevronDown, Check } from "lucide-react";

interface RoleSwitcherProps {
  currentRole: string;
  userName: string;
}

const ROLES = [
  {
    role: "TENANT",
    label: "Locataire",
    persona: "Youssef Trabelsi",
    icon: Home,
    color: "emerald",
    bgClass: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  },
  {
    role: "OWNER",
    label: "Propriétaire",
    persona: "Sarah Ben Ali",
    icon: UserCheck,
    color: "blue",
    bgClass: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  },
  {
    role: "TECHNICIAN",
    label: "Technicien",
    persona: "Ahmed Gharbi (Plomberie)",
    icon: Wrench,
    color: "amber",
    bgClass: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  },
  {
    role: "ADMIN",
    label: "Administrateur",
    persona: "Super Admin",
    icon: Shield,
    color: "purple",
    bgClass: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  },
];

export function RoleSwitcher({ currentRole, userName }: RoleSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const activeRoleConfig = ROLES.find((r) => r.role === currentRole) || ROLES[0];
  const Icon = activeRoleConfig.icon;

  const handleSwitch = async (role: string) => {
    setLoading(true);
    setOpen(false);
    try {
      await fetch("/api/auth/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      router.refresh();
      // Reload window to re-trigger server components cleanly
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch role:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all hover:scale-[1.02] shadow-sm ${activeRoleConfig.bgClass}`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline text-slate-300 font-normal">Vue :</span>
        <span>{activeRoleConfig.label}</span>
        <span className="text-[10px] opacity-75 hidden md:inline">({userName})</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
            <div className="px-3 py-1.5 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Changer de perspective (Soutenance)
            </div>
            <div className="mt-1 space-y-1">
              {ROLES.map((r) => {
                const ItemIcon = r.icon;
                const isSelected = r.role === currentRole;
                return (
                  <button
                    key={r.role}
                    onClick={() => handleSwitch(r.role)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-blue-600/20 text-blue-300 font-semibold"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <ItemIcon className="w-4 h-4 text-slate-400" />
                      <div>
                        <div className="font-medium">{r.label}</div>
                        <div className="text-[10px] text-slate-400">{r.persona}</div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default RoleSwitcher;
