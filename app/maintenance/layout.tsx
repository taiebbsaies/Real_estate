import React from "react";
import { auth } from "@/src/lib/auth";
import { Navbar } from "@/src/components/maintenance/Navbar";

export const instant = false;

export const metadata = {
  title: "Module Maintenance — HomeCheck",
  description: "Plateforme de gestion du cycle de vie des interventions et incidents locatifs HomeCheck.",
};

export default async function MaintenanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-white">
      <Navbar user={session.user} />
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </div>
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>HomeCheck Rental Lifecycle PWA &bull; Module Maintenance &bull; Architecture Défense 2026</p>
      </footer>
    </div>
  );
}
