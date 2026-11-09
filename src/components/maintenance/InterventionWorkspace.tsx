"use client";

import React, { useState } from "react";
import {
  Wrench,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  Camera,
  AlertCircle,
  Loader2,
  Play,
} from "lucide-react";
import { PhotoUploader } from "./PhotoUploader";

interface PhotoItem {
  storageKey: string;
  photoType: "BEFORE" | "AFTER";
  originalName: string;
}

interface InterventionWorkspaceProps {
  requestId: string;
  requestStatus: string;
  expectedVersion: number;
  interventionId: string;
  initialData?: {
    diagnostic?: string;
    workDone?: string;
    partsReplaced?: string[];
    cost?: number;
    durationMinutes?: number;
    comment?: string;
    photos?: PhotoItem[];
  };
  onSuccess: () => void;
}

export function InterventionWorkspace({
  requestId,
  requestStatus,
  expectedVersion,
  interventionId,
  initialData,
  onSuccess,
}: InterventionWorkspaceProps) {
  const [diagnostic, setDiagnostic] = useState(initialData?.diagnostic || "");
  const [workDone, setWorkDone] = useState(initialData?.workDone || "");
  const [parts, setParts] = useState<string[]>(initialData?.partsReplaced || []);
  const [newPartInput, setNewPartInput] = useState("");
  const [cost, setCost] = useState<number>(initialData?.cost || 0);
  const [durationMinutes, setDurationMinutes] = useState<number>(
    initialData?.durationMinutes || 60
  );
  const [comment, setComment] = useState(initialData?.comment || "");
  const [photos, setPhotos] = useState<PhotoItem[]>(initialData?.photos || []);

  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isAssigned = requestStatus === "TECHNICIEN_ASSIGNE";
  const isInProgress = requestStatus === "EN_COURS";
  const isResolvedOrClosed = ["RESOLUE", "CLOTUREE"].includes(requestStatus);

  const handleStartIntervention = async () => {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch(`/api/maintenance-requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus: "EN_COURS",
          expectedVersion,
          comment: "Technicien arrivé sur place. Début de l'intervention.",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setSuccessMsg("Intervention démarrée avec succès !");
      onSuccess();
    } catch (err: unknown) {
      setError((err as Error).message || "Erreur de démarrage");
    } finally {
      setStarting(false);
    }
  };

  const handleAddPart = () => {
    const trimmed = newPartInput.trim();
    if (trimmed && !parts.includes(trimmed)) {
      setParts([...parts, trimmed]);
      setNewPartInput("");
    }
  };

  const handleRemovePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/interventions/${interventionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnostic,
          workDone,
          partsReplaced: parts,
          cost,
          durationMinutes,
          comment,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setSuccessMsg("Rapport sauvegardé avec succès.");
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkResolved = async () => {
    if (!diagnostic.trim()) {
      setError("Le diagnostic technique est obligatoire pour marquer l'intervention comme résolue.");
      return;
    }
    if (!workDone.trim()) {
      setError("Le détail des travaux effectués est obligatoire pour marquer l'intervention comme résolue.");
      return;
    }

    setResolving(true);
    setError(null);
    try {
      // 1. Save intervention data first
      await fetch(`/api/interventions/${interventionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diagnostic,
          workDone,
          partsReplaced: parts,
          cost,
          durationMinutes,
          comment,
          completedAt: new Date().toISOString(),
        }),
      });

      // 2. Transition status to RESOLUE
      const res = await fetch(`/api/maintenance-requests/${requestId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus: "RESOLUE",
          expectedVersion,
          diagnostic,
          workDone,
          comment: "Travaux terminés avec succès par le technicien.",
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message);

      setSuccessMsg("Intervention marquée comme résolue avec succès !");
      onSuccess();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setResolving(false);
    }
  };

  const beforePhotos = photos.filter((p) => p.photoType === "BEFORE");
  const afterPhotos = photos.filter((p) => p.photoType === "AFTER");

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-xl space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2 text-cyan-400">
          <Wrench className="w-5 h-5" />
          <h3 className="font-bold text-base text-slate-100">Espace Intervention Technicien</h3>
        </div>
        {isAssigned && (
          <button
            onClick={handleStartIntervention}
            disabled={starting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/20 transition-all animate-pulse"
          >
            {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
            <span>Démarrer l'intervention (Sur place)</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Forms & Diagnostic inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Diagnostic Technique <span className="text-cyan-400">*</span>
          </label>
          <textarea
            rows={3}
            disabled={isResolvedOrClosed}
            value={diagnostic}
            onChange={(e) => setDiagnostic(e.target.value)}
            placeholder="Ex : Défaut d'étanchéité au raccord fileté, joint torique usé..."
            className="w-full rounded-xl bg-slate-800/80 border border-slate-700 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-75"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Travaux Effectués <span className="text-cyan-400">*</span>
          </label>
          <textarea
            rows={3}
            disabled={isResolvedOrClosed}
            value={workDone}
            onChange={(e) => setWorkDone(e.target.value)}
            placeholder="Ex : Démontage, remplacement du joint téflon 20/27, resserrage et test..."
            className="w-full rounded-xl bg-slate-800/80 border border-slate-700 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-75"
          />
        </div>
      </div>

      {/* Parts replaced & Costs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-1">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Pièces Remplacées
          </label>
          {!isResolvedOrClosed && (
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newPartInput}
                onChange={(e) => setNewPartInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddPart();
                  }
                }}
                placeholder="Ex : Joint 32mm"
                className="flex-1 rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={handleAddPart}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5">
            {parts.map((p, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 text-xs border border-slate-700"
              >
                <span>{p}</span>
                {!isResolvedOrClosed && (
                  <button onClick={() => handleRemovePart(i)} className="hover:text-rose-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </span>
            ))}
            {parts.length === 0 && (
              <span className="text-xs text-slate-500 italic">Aucune pièce ajoutée</span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Coût Total de l'Intervention (DT)
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              disabled={isResolvedOrClosed}
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
              className="w-full rounded-xl bg-slate-800/80 border border-slate-700 pl-3 pr-10 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 disabled:opacity-75"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              DT
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Durée de l'intervention (minutes)
          </label>
          <div className="relative">
            <input
              type="number"
              min={0}
              step={15}
              disabled={isResolvedOrClosed}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full rounded-xl bg-slate-800/80 border border-slate-700 pl-3 pr-12 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 disabled:opacity-75"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              min
            </span>
          </div>
        </div>
      </div>

      {/* Before / After Photos Section */}
      <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Photo Avant */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-amber-400" /> Photo AVANT travaux
            </span>
            <span className="text-[11px] text-slate-500">{beforePhotos.length} photo(s)</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {beforePhotos.map((p, idx) => (
              <img
                key={idx}
                src={`/api/photos/${p.storageKey}`}
                alt="Avant travaux"
                className="w-full h-24 object-cover rounded-xl border border-slate-800"
              />
            ))}
          </div>

          {!isResolvedOrClosed && (
            <PhotoUploader
              uploadEndpoint={`/api/interventions/${interventionId}/photos`}
              photoType="BEFORE"
              existingPhotosCount={beforePhotos.length}
              onPhotoUploaded={(p) => setPhotos([...photos, p as PhotoItem])}
            />
          )}
        </div>

        {/* Photo Après */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-emerald-400" /> Photo APRÈS travaux
            </span>
            <span className="text-[11px] text-slate-500">{afterPhotos.length} photo(s)</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {afterPhotos.map((p, idx) => (
              <img
                key={idx}
                src={`/api/photos/${p.storageKey}`}
                alt="Après travaux"
                className="w-full h-24 object-cover rounded-xl border border-slate-800"
              />
            ))}
          </div>

          {!isResolvedOrClosed && (
            <PhotoUploader
              uploadEndpoint={`/api/interventions/${interventionId}/photos`}
              photoType="AFTER"
              existingPhotosCount={afterPhotos.length}
              onPhotoUploaded={(p) => setPhotos([...photos, p as PhotoItem])}
            />
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {!isResolvedOrClosed && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving || resolving}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 disabled:opacity-50 transition-all"
          >
            {saving ? "Sauvegarde..." : "Enregistrer le brouillon"}
          </button>

          <button
            type="button"
            onClick={handleMarkResolved}
            disabled={resolving || saving || !diagnostic.trim() || !workDone.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/25 disabled:opacity-50 transition-all hover:-translate-y-0.5"
          >
            {resolving && <Loader2 className="w-4 h-4 animate-spin" />}
            <CheckCircle2 className="w-4 h-4" />
            <span>Marquer l'intervention comme résolue (RESOLUE)</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default InterventionWorkspace;
