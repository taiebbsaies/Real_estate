"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building,
  History,
  Calendar,
  Wrench,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
} from "lucide-react";
import { StatusBadge } from "@/src/components/maintenance/StatusBadge";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PropertyHistoryPage({ params }: PageProps) {
  const { id } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/properties/${id}/maintenance-history`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json);
        } else {
          setError(json.message);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-500 text-xs">
        <History className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <span>Reconstitution du jumeau numérique de la propriété...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center space-y-3">
        <h2 className="text-lg font-bold text-slate-100">Historique indisponible</h2>
        <p className="text-xs text-slate-400">{error || "Erreur de chargement"}</p>
        <Link
          href="/maintenance"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour</span>
        </Link>
      </div>
    );
  }

  const property = data.property;
  const history = data.data || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link
          href="/maintenance"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux interventions</span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
              Jumeau Numérique & Historique : {property.title}
            </h1>
            <p className="text-xs text-slate-400">
              {property.address}, {property.city} &bull; Traçabilité immuable des travaux et interventions
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            <span>Journal Chronologique des Événements ({history.length})</span>
          </span>
          <span className="text-[11px] text-slate-500">Du plus récent au plus ancien</span>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Aucun historique technique enregistré pour ce bien.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 border-l-2 border-slate-800 ml-3">
            {history.map((item: any, idx: number) => (
              <div key={item._id} className="relative group">
                {/* Dot */}
                <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-blue-500 group-hover:bg-blue-600 transition-colors" />

                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-100">
                        {item.actorRole === "SYSTEM"
                          ? "Auto-dispatch Système"
                          : `${item.actorId?.firstName || "Utilisateur"} (${item.actorRole})`}
                      </span>
                      {item.fromStatus && item.toStatus && (
                        <span className="text-xs text-slate-400">
                          {item.fromStatus} &rarr;{" "}
                          <strong className="text-blue-400">{item.toStatus}</strong>
                        </span>
                      )}
                    </div>

                    <span className="text-[11px] text-slate-500">
                      {new Date(item.timestamp).toLocaleDateString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 italic">"{item.comment}"</p>

                  {item.requestId && (
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
                      <span className="text-slate-400">
                        Demande associée : <strong>{item.requestId.title}</strong>
                      </span>
                      <Link
                        href={`/maintenance/requests/${item.requestId._id}`}
                        className="inline-flex items-center gap-1 text-blue-400 hover:underline text-[11px]"
                      >
                        <span>Consulter le ticket</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
