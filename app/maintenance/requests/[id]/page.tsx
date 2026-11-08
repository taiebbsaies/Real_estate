"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Wrench,
  Building,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Camera,
  Star,
  RotateCcw,
  Shield,
  Loader2,
  Check,
  Tag,
  DollarSign,
  History,
} from "lucide-react";
import { StatusBadge } from "@/src/components/maintenance/StatusBadge";
import { PriorityTag } from "@/src/components/maintenance/PriorityTag";
import { StatusTimeline } from "@/src/components/maintenance/StatusTimeline";
import {
  RejectModal,
  ReopenModal,
  AssignTechnicianModal,
  ReviewModal,
} from "@/src/components/maintenance/MaintenanceModals";
import { InterventionWorkspace } from "@/src/components/maintenance/InterventionWorkspace";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MaintenanceRequestDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const [request, setRequest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const loadDetail = async () => {
    try {
      const res = await fetch(`/api/maintenance-requests/${id}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Impossible de charger la demande.");
      }
      setRequest(json.data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-slate-500 text-xs">
        <Wrench className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <span>Chargement du dossier d'intervention...</span>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="py-16 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-slate-100">Demande introuvable</h2>
        <p className="text-xs text-slate-400">{error || "Cet incident n'existe pas."}</p>
        <Link
          href="/maintenance"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour aux demandes</span>
        </Link>
      </div>
    );
  }

  const currentUser = request.currentUser;
  const userRole = currentUser?.role || "TENANT";

  // Actions handlers
  const handleTransition = async (
    targetStatus: string,
    extra: { reason?: string; comment?: string } = {}
  ) => {
    setActionLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/maintenance-requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus,
          expectedVersion: request.__v,
          reason: extra.reason,
          comment: extra.comment,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      await loadDetail();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  // Direct Assign from modal
  const handleAssignTechnician = async (technicianId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/maintenance-requests/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          technicianId,
          directAssignment: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setAssignOpen(false);
      await loadDetail();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  // Tech accept/refuse proposal
  const handleTechResponse = async (action: "ACCEPT" | "REFUSE") => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/maintenance-requests/${id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      await loadDetail();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  // Tenant review
  const handleReviewSubmit = async (rating: number, comment: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: id,
          technicianId: request.assignedTechnicianId?._id || request.intervention?.technicianId?._id,
          rating,
          comment,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setReviewOpen(false);
      await loadDetail();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const isOwnerOrAdmin = ["OWNER", "ADMIN"].includes(userRole);
  const isTenant = userRole === "TENANT";
  const isTech = userRole === "TECHNICIAN";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Return Navigation & Top Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/maintenance"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la liste</span>
        </Link>

        <div className="flex items-center gap-2">
          <PriorityTag priority={request.priority} />
          <StatusBadge status={request.status} />
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Request Card */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
            {request.categoryId?.name || "Maintenance"}
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 mt-1">
            {request.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
            {request.description}
          </p>
        </div>

        {/* Stepper Timeline */}
        <div className="pt-2 border-t border-slate-800">
          <StatusTimeline
            currentStatus={request.status}
            createdAt={request.createdAt}
            resolvedAt={request.resolvedAt}
            closedAt={request.closedAt}
          />
        </div>

        {/* Context metadata: Property, Equipment, Parties */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-slate-500 flex items-center gap-1.5 text-[11px] mb-1">
              <Building className="w-3.5 h-3.5 text-slate-400" /> Logement
            </span>
            <div className="font-semibold text-slate-200">{request.propertyId?.title}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {request.propertyId?.address}, {request.propertyId?.city}
            </div>
            <Link
              href={`/maintenance/properties/${request.propertyId?._id}/history`}
              className="inline-flex items-center gap-1 text-[11px] text-blue-400 hover:underline mt-2"
            >
              <History className="w-3 h-3" /> Jumeau numérique & historique
            </Link>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-slate-500 flex items-center gap-1.5 text-[11px] mb-1">
              <User className="w-3.5 h-3.5 text-slate-400" /> Parties prenantes
            </span>
            <div className="text-[11px] text-slate-300">
              Locataire : <strong className="text-slate-100">{request.tenantId?.firstName} {request.tenantId?.lastName}</strong>
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              Technicien :{" "}
              {request.assignedTechnicianId ? (
                <strong className="text-indigo-400">
                  {request.assignedTechnicianId.firstName} {request.assignedTechnicianId.lastName}
                </strong>
              ) : (
                <span className="text-slate-500 italic">Non assigné</span>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <span className="text-slate-500 flex items-center gap-1.5 text-[11px] mb-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Horodatage
            </span>
            <div className="text-[11px] text-slate-300">
              Signalé le : {new Date(request.createdAt).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>
            {request.resolvedAt && (
              <div className="text-[11px] text-emerald-400 mt-1">
                Résolu le : {new Date(request.resolvedAt).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
            {request.closedAt && (
              <div className="text-[11px] text-emerald-300 mt-1">
                Clôturé le : {new Date(request.closedAt).toLocaleDateString("fr-FR")}
              </div>
            )}
          </div>
        </div>

        {/* Rejection / Reopen notices */}
        {request.rejectionReason && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <strong className="font-semibold text-rose-400">Motif du rejet par le bailleur : </strong>
            <span>{request.rejectionReason}</span>
          </div>
        )}

        {request.reopenReason && (
          <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs">
            <strong className="font-semibold text-orange-400">Motif de la réouverture par le locataire : </strong>
            <span>{request.reopenReason}</span>
          </div>
        )}

        {/* Tenant Initial Photos Gallery */}
        {request.photos && request.photos.length > 0 && (
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-blue-400" /> Photos fournies au signalement ({request.photos.length})
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {request.photos.map((p: any, idx: number) => (
                <div key={idx} className="relative rounded-xl overflow-hidden border border-slate-800 h-28 group">
                  <img
                    src={`/api/photos/${p.storageKey}`}
                    alt="Photo signalement"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-slate-100">
                    {p.originalName}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ACTION TOOLBAR: strictly based on current state & role */}
        <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Actions disponibles pour votre rôle (<strong>{userRole}</strong>) :
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Tenant cancel */}
            {["CREEE", "EN_ATTENTE"].includes(request.status) && (isTenant || userRole === "ADMIN") && (
              <button
                onClick={() => handleTransition("ANNULEE", { comment: "Annulée par le locataire" })}
                disabled={actionLoading}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-300 border border-rose-500/30 text-xs font-medium transition-all"
              >
                Annuler ma demande
              </button>
            )}

            {/* 2. Owner Accept / Reject */}
            {request.status === "EN_ATTENTE" && isOwnerOrAdmin && (
              <>
                <button
                  onClick={() => setRejectOpen(true)}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-all"
                >
                  Rejeter la demande
                </button>
                <button
                  onClick={() => handleTransition("ACCEPTEE", { comment: "Demande approuvée par le propriétaire" })}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
                >
                  {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>Accepter la demande</span>
                </button>
              </>
            )}

            {/* 3. Owner Assign Technician */}
            {["ACCEPTEE", "REOUVERTE"].includes(request.status) && isOwnerOrAdmin && (
              <button
                onClick={() => setAssignOpen(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Assigner un technicien (Matching IA)</span>
              </button>
            )}

            {/* 4. Technician Respond to Proposal */}
            {request.status === "ACCEPTEE" && isTech && (
              <>
                <button
                  onClick={() => handleTechResponse("REFUSE")}
                  disabled={actionLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 text-xs font-medium"
                >
                  Décliner
                </button>
                <button
                  onClick={() => handleTechResponse("ACCEPT")}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accepter cette mission</span>
                </button>
              </>
            )}

            {/* 5. Close Request */}
            {request.status === "RESOLUE" && (
              <button
                onClick={() => handleTransition("CLOTUREE", { comment: "Clôture confirmée après vérification" })}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/25 transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmer et Clôturer</span>
              </button>
            )}

            {/* 6. Reopen Request */}
            {["RESOLUE", "CLOTUREE"].includes(request.status) && (isTenant || userRole === "ADMIN") && (
              <button
                onClick={() => setReopenOpen(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-600/10 hover:bg-orange-600/20 text-orange-400 border border-orange-500/30 text-xs font-semibold transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réouvrir (Problème non résolu)</span>
              </button>
            )}

            {/* 7. Leave Review */}
            {request.status === "CLOTUREE" && isTenant && (
              <button
                onClick={() => setReviewOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/25 transition-all"
              >
                <Star className="w-3.5 h-3.5 fill-white" />
                <span>Laisser un avis (1-5 étoiles)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TECHNICIAN WORKSPACE (Visible to technician or admin if intervention assigned / in progress / resolved) */}
      {(["TECHNICIEN_ASSIGNE", "EN_COURS"].includes(request.status) && (isTech || userRole === "ADMIN")) && (
        <InterventionWorkspace
          requestId={id}
          requestStatus={request.status}
          expectedVersion={request.__v}
          interventionId={request.intervention?._id || id}
          initialData={request.intervention}
          onSuccess={loadDetail}
        />
      )}

      {/* RESOLVED / COMPLETED INTERVENTION SUMMARY CARD */}
      {["RESOLUE", "CLOTUREE"].includes(request.status) && request.intervention && (
        <div className="rounded-2xl bg-slate-900 border border-emerald-500/30 p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-100">Rapport d'Intervention Finalisé</h3>
            </div>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Coût Total : {request.intervention.cost} DT
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                Diagnostic Technique
              </span>
              <p className="text-slate-200 leading-relaxed">{request.intervention.diagnostic}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800">
              <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                Travaux Réalisés
              </span>
              <p className="text-slate-200 leading-relaxed">{request.intervention.workDone}</p>
            </div>
          </div>

          {request.intervention.partsReplaced && request.intervention.partsReplaced.length > 0 && (
            <div className="text-xs">
              <span className="font-semibold text-slate-400 mr-2">Pièces remplacées :</span>
              <div className="inline-flex flex-wrap gap-1.5 mt-1">
                {request.intervention.partsReplaced.map((part: string, idx: number) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs"
                  >
                    {part}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Before & After Photo Comparison */}
          {request.intervention.photos && request.intervention.photos.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Preuves Photographiques (Avant / Après)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Before */}
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" /> Photos AVANT travaux
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {request.intervention.photos
                      .filter((p: any) => p.photoType === "BEFORE")
                      .map((p: any, i: number) => (
                        <img
                          key={i}
                          src={`/api/photos/${p.storageKey}`}
                          alt="Avant"
                          className="w-full h-24 object-cover rounded-lg border border-slate-700"
                        />
                      ))}
                  </div>
                </div>

                {/* After */}
                <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" /> Photos APRÈS travaux
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {request.intervention.photos
                      .filter((p: any) => p.photoType === "AFTER")
                      .map((p: any, i: number) => (
                        <img
                          key={i}
                          src={`/api/photos/${p.storageKey}`}
                          alt="Après"
                          className="w-full h-24 object-cover rounded-lg border border-slate-700"
                        />
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* IMMUTABLE MAINTENANCE AUDIT HISTORY (Digital Twin Trail) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-slate-300">
            <History className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base text-slate-100">Journal d'Audit Immuable (Jumeau Numérique)</h3>
          </div>
          <span className="text-xs text-slate-500">
            {request.history?.length || 0} événement(s) enregistré(s)
          </span>
        </div>

        <div className="space-y-3">
          {(request.history || []).map((entry: any) => (
            <div
              key={entry._id}
              className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 flex items-start justify-between gap-3 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">
                    {entry.actorRole === "SYSTEM"
                      ? "Système HomeCheck"
                      : `${entry.actorId?.firstName || "Utilisateur"} (${entry.actorRole})`}
                  </span>
                  {entry.fromStatus && entry.toStatus && (
                    <span className="text-slate-500">
                      a fait passer le statut de <strong>{entry.fromStatus}</strong> à{" "}
                      <strong className="text-blue-400">{entry.toStatus}</strong>
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-[11px] italic">"{entry.comment}"</p>
              </div>

              <span className="text-[10px] text-slate-500 shrink-0">
                {new Date(entry.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}{" "}
                - {new Date(entry.timestamp).toLocaleDateString("fr-FR")}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* MODALS */}
      <RejectModal
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        loading={actionLoading}
        onSubmit={(reason) => {
          setRejectOpen(false);
          handleTransition("REJETEE", { reason, comment: `Rejeté par le propriétaire : ${reason}` });
        }}
      />

      <ReopenModal
        isOpen={reopenOpen}
        onClose={() => setReopenOpen(false)}
        loading={actionLoading}
        onSubmit={(reason) => {
          setReopenOpen(false);
          handleTransition("REOUVERTE", { reason, comment: `Réouvert par le locataire : ${reason}` });
        }}
      />

      <AssignTechnicianModal
        isOpen={assignOpen}
        onClose={() => setAssignOpen(false)}
        requestId={id}
        loading={actionLoading}
        onAssign={handleAssignTechnician}
      />

      <ReviewModal
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        requestId={id}
        technicianId={request.assignedTechnicianId?._id || request.intervention?.technicianId?._id || ""}
        technicianName={
          request.assignedTechnicianId
            ? `${request.assignedTechnicianId.firstName} ${request.assignedTechnicianId.lastName}`
            : "le technicien"
        }
        loading={actionLoading}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
}
