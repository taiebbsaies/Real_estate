"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Wrench,
  PlusCircle,
  Filter,
  Search,
  Building,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/src/components/maintenance/StatusBadge";
import { PriorityTag } from "@/src/components/maintenance/PriorityTag";
import { type MaintenanceStatus, type Priority } from "@/src/modules/maintenance/constants";

interface RequestItem {
  _id: string;
  title: string;
  description: string;
  priority: Priority;
  status: MaintenanceStatus;
  createdAt: string;
  categoryId?: { name: string; slug: string; icon: string };
  propertyId?: { title: string; address: string; city: string };
  tenantId?: { firstName: string; lastName: string };
  assignedTechnicianId?: { firstName: string; lastName: string; avatarUrl?: string };
  photos?: Array<{ storageKey: string }>;
}

export function MaintenanceDashboard({ role }: { role: string }) {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [predictiveAlerts, setPredictiveAlerts] = useState<any[]>([]);
  const [techTab, setTechTab] = useState<"DISPO" | "ACCEPTEE" | "EN_COURS" | "TERMINEE">("ACCEPTEE");

  useEffect(() => {
    loadRequests();
    loadPredictiveAlerts();
  }, [statusFilter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const url = new URL("/api/maintenance-requests", window.location.origin);
      if (statusFilter !== "ALL") {
        url.searchParams.set("status", statusFilter);
      }
      const res = await fetch(url.toString());
      const json = await res.json();
      if (json.success) {
        setRequests(json.data);
      }
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadPredictiveAlerts = async () => {
    try {
      const res = await fetch("/api/admin/maintenance-stats");
      const json = await res.json();
      if (json.success && json.data?.predictiveAlerts) {
        setPredictiveAlerts(json.data.predictiveAlerts);
      }
    } catch {
      // non-critical
    }
  };

  // Filter requests for technician tabs
  const filterByTechTab = (items: RequestItem[]) => {
    if (role !== "TECHNICIAN") return items;
    switch (techTab) {
      case "DISPO":
        return items.filter((r) => r.status === "ACCEPTEE");
      case "ACCEPTEE":
        return items.filter((r) => r.status === "TECHNICIEN_ASSIGNE");
      case "EN_COURS":
        return items.filter((r) => r.status === "EN_COURS");
      case "TERMINEE":
        return items.filter((r) => ["RESOLUE", "CLOTUREE"].includes(r.status));
      default:
        return items;
    }
  };

  const displayedRequests = filterByTechTab(requests).filter((r) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(query) ||
      r.description.toLowerCase().includes(query) ||
      r.propertyId?.title.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
            {role === "TENANT" && "Mes Demandes d'Intervention"}
            {role === "OWNER" && "Gestion Technique du Parc Locatif"}
            {role === "TECHNICIAN" && "Espace Missions & Travaux"}
            {role === "ADMIN" && "Supervision Globale de la Maintenance"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {role === "TENANT" && "Signalez un problème dans votre logement et suivez l'avancement en direct."}
            {role === "OWNER" && "Validez les devis, assignez des techniciens qualifiés et anticipez les pannes."}
            {role === "TECHNICIAN" && "Consultez vos interventions assignées, complétez le diagnostic et saisissez vos coûts."}
            {role === "ADMIN" && "Vue d'ensemble sur l'ensemble des tickets du parc immobilier."}
          </p>
        </div>

        {["TENANT", "ADMIN"].includes(role) && (
          <Link
            href="/maintenance/requests/new"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Signaler un Problème</span>
          </Link>
        )}
      </div>

      {/* Owner Predictive Maintenance Banner */}
      {["OWNER", "ADMIN"].includes(role) && predictiveAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-amber-300">
                Alerte Maintenance Préventive ({predictiveAlerts.length})
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 uppercase">
                Détection Récurrence
              </span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              {predictiveAlerts[0]?.recommendation} sur <strong>{predictiveAlerts[0]?.propertyTitle}</strong>.
            </p>
          </div>
          <Link
            href="/maintenance/admin"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold shrink-0"
          >
            <span>Détails prédictifs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Technician 4 Tabs */}
      {role === "TECHNICIAN" && (
        <div className="flex gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
          {[
            { key: "ACCEPTEE", label: "Missions Assignées", count: requests.filter((r) => r.status === "TECHNICIEN_ASSIGNE").length },
            { key: "EN_COURS", label: "En Cours (Sur place)", count: requests.filter((r) => r.status === "EN_COURS").length },
            { key: "DISPO", label: "Disponibles (À pourvoir)", count: requests.filter((r) => r.status === "ACCEPTEE").length },
            { key: "TERMINEE", label: "Historique / Terminées", count: requests.filter((r) => ["RESOLUE", "CLOTUREE"].includes(r.status)).length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTechTab(tab.key as any)}
              className={`flex-1 min-w-[140px] flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                techTab === tab.key
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                techTab === tab.key ? "bg-white/20 text-white" : "bg-slate-800 text-slate-400"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par titre, description..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {role !== "TECHNICIAN" && (
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: "ALL", label: "Tous" },
              { id: "EN_ATTENTE", label: "En attente" },
              { id: "ACCEPTEE", label: "Acceptées" },
              { id: "EN_COURS", label: "En cours" },
              { id: "RESOLUE", label: "Résolues" },
              { id: "CLOTUREE", label: "Clôturées" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                  statusFilter === s.id
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Requests List Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500 text-xs">
          <Wrench className="w-8 h-8 animate-spin text-blue-500 mb-3" />
          <span>Chargement des interventions...</span>
        </div>
      ) : displayedRequests.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 p-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-sm text-slate-200">Aucune intervention trouvée</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {role === "TENANT"
              ? "Vous n'avez aucun incident signalé en cours. Cliquez sur 'Signaler un problème' si nécessaire."
              : "Aucune intervention ne correspond aux critères de filtre sélectionnés."}
          </p>
          {role === "TENANT" && (
            <Link
              href="/maintenance/requests/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold mt-2"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nouveau signalement</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedRequests.map((req) => (
            <Link
              key={req._id}
              href={`/maintenance/requests/${req._id}`}
              className="group flex flex-col justify-between p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40"
            >
              <div className="space-y-3">
                {/* Header: Priority & Status */}
                <div className="flex items-center justify-between gap-2">
                  <PriorityTag priority={req.priority} />
                  <StatusBadge status={req.status} />
                </div>

                {/* Title & Category */}
                <div>
                  <h3 className="font-bold text-sm text-slate-100 group-hover:text-blue-400 transition-colors line-clamp-1">
                    {req.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                    {req.description}
                  </p>
                </div>
              </div>

              {/* Footer info: Property, Date, Photos */}
              <div className="pt-4 mt-4 border-t border-slate-800/80 space-y-2 text-xs text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-300 font-medium truncate max-w-[180px]">
                    <Building className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{req.propertyId?.title || "Propriété"}</span>
                  </span>

                  {req.photos && req.photos.length > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Camera className="w-3.5 h-3.5 text-slate-500" />
                      <span>{req.photos.length}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(req.createdAt).toLocaleDateString("fr-FR")}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 text-blue-400 group-hover:translate-x-0.5 transition-transform font-medium">
                    <span>Détail</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
