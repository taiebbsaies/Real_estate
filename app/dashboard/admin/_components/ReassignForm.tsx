"use client";

import { useActionState, useState } from "react";
import { reassignTechnician, type AdminActionState } from "@/app/actions/admin";
import { buttonClass, inputClass } from "./styles";

type Candidate = {
  technicianId: string;
  name: string;
  matchScore: number;
  hasRequiredSkill: boolean;
  distanceKm: number | null;
};

const INITIAL: AdminActionState = { success: false, message: "" };

export default function ReassignForm({
  requestId,
  currentTechnicianId,
}: {
  requestId: string;
  currentTechnicianId?: string;
}) {
  const [state, formAction, pending] = useActionState(reassignTechnician, INITIAL);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/technicians/recommended?requestId=${requestId}`);
      const json = await response.json();
      if (!json.success) throw new Error(json.message);
      setCandidates(
        (json.data as Candidate[]).filter((item) => item.technicianId !== currentTechnicianId),
      );
    } catch (loadError) {
      setError((loadError as Error).message || "Impossible de charger les techniciens.");
    } finally {
      setLoading(false);
    }
  };

  if (state.success) {
    return <p className="text-xs text-emerald-700 dark:text-emerald-400">{state.message}</p>;
  }

  if (!candidates) {
    return (
      <div>
        <button type="button" onClick={load} disabled={loading} className={buttonClass}>
          {loading ? "Chargement…" : currentTechnicianId ? "Remplacer" : "Assigner"}
        </button>
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>}
      </div>
    );
  }

  if (candidates.length === 0) {
    return <p className="text-xs text-[#6B7280] dark:text-zinc-400">Aucun autre technicien disponible.</p>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <select name="technicianId" aria-label="Technicien" className={`${inputClass} max-w-56`}>
        {candidates.map((item) => (
          <option key={item.technicianId} value={item.technicianId}>
            {item.name} ({item.matchScore} %
            {item.hasRequiredSkill ? ", spécialité" : ""}
            {item.distanceKm !== null ? `, ${item.distanceKm} km` : ""})
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending} className={`${buttonClass} disabled:opacity-50`}>
        {pending ? "…" : "Confirmer"}
      </button>
      {state.message && (
        <p role="alert" className="w-full text-xs text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}
    </form>
  );
}
