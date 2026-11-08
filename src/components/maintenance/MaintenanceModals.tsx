"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Star,
  MapPin,
  Clock,
  DollarSign,
  Plus,
  Loader2,
  Sparkles,
  Camera,
} from "lucide-react";
import { TECHNICIAN_SKILLS } from "@/lib/constants/technician";
import { PhotoUploader } from "./PhotoUploader";

// --- 1. REJECT MODAL ---
export function RejectModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-100">Rejeter la demande</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Veuillez indiquer un motif clair et obligatoire expliquant pourquoi cette intervention
          ne peut pas être prise en charge. Le locataire en sera notifié.
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Motif du rejet <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex : Réparation incombant au locataire selon l'état des lieux d'entrée..."
            className="w-full rounded-xl bg-slate-800/80 border border-slate-700 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={loading || !reason.trim()}
            onClick={() => onSubmit(reason.trim())}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-all"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Confirmer le rejet</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 2. REOPEN MODAL ---
export function ReopenModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-orange-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-base text-slate-100">Réouvrir la demande</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Si le problème persiste ou si les travaux ne sont pas satisfaisants, indiquez la raison
          obligatoire de la réouverture pour alerter le propriétaire et le technicien.
        </p>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Motif de la réouverture <span className="text-orange-400">*</span>
          </label>
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex : La fuite d'eau s'est remise à couler dès la première utilisation ce matin..."
            className="w-full rounded-xl bg-slate-800/80 border border-slate-700 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={loading || !reason.trim()}
            onClick={() => onSubmit(reason.trim())}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-50 transition-all"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Confirmer la réouverture</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 3. ASSIGN TECHNICIAN MODAL WITH AI MATCHING ---
export function AssignTechnicianModal({
  isOpen,
  onClose,
  requestId,
  onAssign,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  onAssign: (technicianId: string) => void;
  loading: boolean;
}) {
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && requestId) {
      setFetching(true);
      setFetchError(null);
      fetch(`/api/technicians/recommended?requestId=${requestId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setTechnicians(json.data);
            if (json.data.length > 0) {
              setSelectedTechId(json.data[0].technicianId);
            }
          } else {
            setFetchError(json.message || "Impossible de charger les techniciens.");
          }
        })
        .catch((err) => {
          console.error("Error loading recommendations:", err);
          setFetchError("Impossible de charger les techniciens.");
        })
        .finally(() => setFetching(false));
    }
  }, [isOpen, requestId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="max-w-2xl w-full max-h-[90vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-blue-400">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-base text-slate-100">Techniciens disponibles pour cette mission</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-3 mb-4">
          Les techniciens ayant la spécialité demandée sont recommandés en premier, puis classés selon la
          distance entre l'adresse de leur profil et le logement, leur note et leur expérience.
        </p>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {fetching ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400 mb-2" />
              <span>Calcul des scores de compatibilité en temps réel...</span>
            </div>
          ) : fetchError ? (
            <div role="alert" className="py-8 text-center text-xs text-rose-400">
              {fetchError}
            </div>
          ) : technicians.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Aucun technicien disponible pour le moment.
            </div>
          ) : (
            technicians.map((t, idx) => {
              const isSelected = selectedTechId === t.technicianId;
              const isTop = idx === 0 && t.hasRequiredSkill;

              return (
                <div
                  key={t.technicianId}
                  onClick={() => setSelectedTechId(t.technicianId)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? "bg-blue-600/10 border-blue-500 ring-2 ring-blue-500/20"
                      : "bg-slate-800/40 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {isTop && (
                    <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-[10px] font-bold text-white shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Recommandé #1
                    </span>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {t.avatarUrl ? (
                        <img
                          src={t.avatarUrl}
                          alt={t.name}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-base font-bold text-slate-300">
                          {t.name[0]}
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-sm text-slate-100 flex items-center gap-2">
                          <span>{t.name}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${
                              t.matchScore >= 85
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : t.matchScore >= 65
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "bg-slate-500/20 text-slate-400"
                            }`}
                          >
                            {t.matchScore}% compatible
                          </span>
                        </h4>

                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>
                              {t.address || t.city || "Adresse non renseignée"}
                              {t.distanceKm !== null ? ` · ${t.distanceKm} km` : " · distance inconnue"}
                            </span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-amber-400">
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                            <span>{t.averageRating} ({t.completedInterventionsCount} avis)</span>
                          </span>
                          <span className="inline-flex items-center gap-1 text-emerald-400">
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>{t.hourlyRateDT} DT / h</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <input
                      type="radio"
                      name="selectedTech"
                      checked={isSelected}
                      onChange={() => setSelectedTechId(t.technicianId)}
                      className="mt-1 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {t.skills.length === 0 ? (
                      <span className="text-[11px] text-slate-500">Aucune spécialité renseignée</span>
                    ) : (
                      t.skills.map((skill: string) => (
                        <span
                          key={skill}
                          className="px-2 py-0.5 rounded-full border border-slate-700 bg-slate-800 text-[11px] text-slate-300"
                        >
                          {TECHNICIAN_SKILLS.find((item) => item.value === skill)?.label ?? skill}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Match explanation */}
                  <p className="mt-2.5 pt-2 border-t border-slate-800 text-[11px] text-slate-400 italic">
                    "{t.matchDetails?.explanation}"
                  </p>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800 mt-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700"
          >
            Fermer
          </button>
          <button
            type="button"
            disabled={loading || !selectedTechId}
            onClick={() => selectedTechId && onAssign(selectedTechId)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Assigner ce technicien</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- 4. REVIEW MODAL ---
export function ReviewModal({
  isOpen,
  onClose,
  requestId,
  technicianId,
  technicianName,
  onSubmit,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  technicianId: string;
  technicianName: string;
  onSubmit: (rating: number, comment: string) => void;
  loading: boolean;
}) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="max-w-md w-full rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400">
            <Star className="w-5 h-5 fill-amber-400" />
            <h3 className="font-bold text-base text-slate-100">Évaluer l'intervention</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Votre retour d'expérience sur l'intervention de <strong>{technicianName}</strong> permet
          d'ajuster l'indice de confiance du technicien dans le système de matching.
        </p>

        {/* 5-Star Interactive Rating */}
        <div className="flex flex-col items-center py-2 space-y-1">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-125 focus:outline-none"
              >
                <Star
                  className={`w-7 h-7 ${
                    (hoverRating || rating) >= star
                      ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                      : "text-slate-600"
                  }`}
                />
              </button>
            ))}
          </div>
          <span className="text-xs font-semibold text-amber-300">
            {rating === 5 && "Excellent service !"}
            {rating === 4 && "Très satisfaisant"}
            {rating === 3 && "Intervention correcte"}
            {rating === 2 && "Médiocre"}
            {rating === 1 && "Très insatisfaisant"}
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Commentaire détaillé (facultatif)
          </label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ponctualité, propreté du chantier, qualité des pièces..."
            className="w-full rounded-xl bg-slate-800/80 border border-slate-700 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700"
          >
            Plus tard
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => onSubmit(rating, comment.trim())}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-600/25 transition-all"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Envoyer mon avis</span>
          </button>
        </div>
      </div>
    </div>
  );
}
