import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/src/lib/auth";
import { Navbar } from "@/src/components/maintenance/Navbar";

export const dynamic = "force-dynamic";

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

  // The maintenance view is driven by the signed-in user's role: no session, no access.
  if (!session.user) {
    redirect("/login?callbackUrl=/maintenance");
  }

  return (
    <div className="maintenance-theme min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500/30 selection:text-slate-100">
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
