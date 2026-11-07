import Link from "next/link";
import { Wrench, Shield, CheckCircle2, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-400 text-sm font-medium">
          <Wrench className="w-4 h-4 animate-spin-slow" />
          <span>HomeCheck Maintenance Module</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Gestion du Cycle de Vie Locatif & Maintenance
        </h1>

        <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
          Plateforme PWA réactive pour locataires, propriétaires, techniciens et administrateurs.
          Suivi des incidents en temps réel, assignation intelligente et jumeau numérique.
        </p>

        <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/maintenance"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5"
          >
            <span>Accéder au Module Maintenance</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/maintenance/requests/new"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700/60 transition-all hover:-translate-y-0.5"
          >
            <span>Signaler un Problème</span>
          </Link>
        </div>

        <div className="pt-8 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-semibold">Machine à États</span>
            </div>
            <p className="text-xs text-slate-400">Verrous optimistes ACID et transitions strictes sécurisées par rôle.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Wrench className="w-4 h-4" />
              <span className="text-sm font-semibold">Matching IA</span>
            </div>
            <p className="text-xs text-slate-400">Recommandation pondérée de techniciens selon compétences, disponibilité et géolocalisation.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Shield className="w-4 h-4" />
              <span className="text-sm font-semibold">Stockage Privé</span>
            </div>
            <p className="text-xs text-slate-400">Photos avant/après privées et streaming sécurisé par token/rôle.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
