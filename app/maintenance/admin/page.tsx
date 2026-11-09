"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
  FolderPlus,
  ArrowLeft,
  Plus,
  Loader2,
  Tag,
  TrendingUp,
  Shield,
  Layers,
} from "lucide-react";

export default function MaintenanceAdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Category Form State
  const [showCatForm, setShowCatForm] = useState(false);
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catIcon, setCatIcon] = useState("Wrench");
  const [catDesc, setCatDesc] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [catError, setCatError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, catRes] = await Promise.all([
        fetch("/api/admin/maintenance-stats"),
        fetch("/api/categories"),
      ]);
      const [statsJson, catJson] = await Promise.all([
        statsRes.json(),
        catRes.json(),
      ]);

      if (statsJson.success) setStats(statsJson.data);
      if (catJson.success) setCategories(catJson.data);
    } catch (err) {
      console.error("Failed to load admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !catSlug.trim()) {
      setCatError("Nom et slug sont obligatoires.");
      return;
    }

    setCatSaving(true);
    setCatError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName.trim(),
          slug: catSlug.trim().toLowerCase(),
          icon: catIcon,
          description: catDesc.trim(),
          isActive: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Erreur de création");
      }

      setCatName("");
      setCatSlug("");
      setCatDesc("");
      setShowCatForm(false);
      await loadData();
    } catch (err: unknown) {
      setCatError((err as Error).message);
    } finally {
      setCatSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-500 text-xs">
        <BarChart3 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <span>Calcul des métriques et indicateurs clés...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <Link
            href="/maintenance"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour au tableau de bord</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-blue-500" />
            <span>Métriques KPIs & Administration Maintenance</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Indicateurs de performance opérationnelle, gestion des coûts et alertes prédictives.
          </p>
        </div>

        <button
          onClick={() => setShowCatForm(!showCatForm)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle Catégorie</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total & Resolved Tickets */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Taux de Résolution</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-slate-100">
            {stats?.totalRequests > 0
              ? `${Math.round((stats.resolvedRequests / stats.totalRequests) * 100)} %`
              : "100 %"}
          </div>
          <div className="text-[11px] text-slate-400">
            {stats?.resolvedRequests || 0} résolues sur {stats?.totalRequests || 0} au total
          </div>
        </div>

        {/* 2. Avg Resolution Time */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Délai Moyen Résolution</span>
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-slate-100">
            {stats?.avgResolutionHours || 0} h
          </div>
          <div className="text-[11px] text-slate-400">
            Délai moyen entre signalement et clôture
          </div>
        </div>

        {/* 3. Total Maintenance Cost DT */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Dépenses Cumulées</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-slate-100">
            {stats?.totalCostDT || 0} <span className="text-sm font-bold text-slate-400">DT</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Coût moyen : {stats?.avgCostDT || 0} DT par intervention
          </div>
        </div>

        {/* 4. Active Tickets in Progress */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">En Cours de Traitement</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-slate-100">
            {(stats?.inProgressRequests || 0) + (stats?.pendingApprovalRequests || 0)}
          </div>
          <div className="text-[11px] text-slate-400">
            {stats?.pendingApprovalRequests || 0} en attente, {stats?.inProgressRequests || 0} sur place
          </div>
        </div>
      </div>

      {/* Predictive Maintenance Aggregations Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-100">
              Détection Prédictive de Vétusté (Pipelines d'Agrégation)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Seuil : ≥ 2 interventions sur 6 mois
          </span>
        </div>

        {(!stats?.predictiveAlerts || stats.predictiveAlerts.length === 0) ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Aucun équipement critique détecté. Tous les équipements sont dans les normes de durabilité.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="pb-3">Équipement</th>
                  <th className="pb-3">Propriété</th>
                  <th className="pb-3">Fréquence Pannes</th>
                  <th className="pb-3">Coût Cumulé</th>
                  <th className="pb-3">Diagnostic & Recommandation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {stats.predictiveAlerts.map((alert: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-3 font-semibold text-slate-100">{alert.equipmentName}</td>
                    <td className="py-3 text-slate-400">{alert.propertyTitle}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold text-[11px]">
                        {alert.interventionsCount} pannes récentes
                      </span>
                    </td>
                    <td className="py-3 font-bold text-emerald-400">{alert.totalCostDT} DT</td>
                    <td className="py-3 text-[11px] text-slate-400 max-w-md">
                      {alert.recommendation}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Category Breakdown & CRUD */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-blue-400">
            <Layers className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-100">Gestion des Catégories de Maintenance</h3>
          </div>
          <span className="text-xs text-slate-500">{categories.length} catégories actives</span>
        </div>

        {/* Modal Form for new category */}
        {showCatForm && (
          <form onSubmit={handleCreateCategory} className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Créer une nouvelle catégorie
            </h4>
            {catError && <p className="text-xs text-rose-400">{catError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Nom (ex: Climatisation)"
                value={catName}
                onChange={(e) => {
                  setCatName(e.target.value);
                  if (!catSlug) setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-"));
                }}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
              />
              <input
                type="text"
                placeholder="Slug unique (ex: climatisation)"
                value={catSlug}
                onChange={(e) => setCatSlug(e.target.value)}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
              />
              <input
                type="text"
                placeholder="Description courte"
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCatForm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={catSaving}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                {catSaving ? "Création..." : "Enregistrer la catégorie"}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {categories.map((c) => (
            <div
              key={c._id}
              className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start justify-between gap-3 text-xs"
            >
              <div>
                <span className="font-bold text-slate-200">{c.name}</span>
                <span className="text-[10px] text-slate-500 block">slug: {c.slug}</span>
                {c.description && (
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{c.description}</p>
                )}
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                Actif
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
