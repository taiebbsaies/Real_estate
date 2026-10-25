"use client";

import { useEffect, useState } from "react";
import { createComplaint } from "@/app/actions/complaints";

const DRAFT_KEY = "homecheck_complaint_draft";

export type DraftComplaint = {
  title: string;
  description: string;
  category: string;
  priority: string;
  savedAt: string; // ISO string
};

/** Save a draft complaint to localStorage (no sensitive data stored) */
export function saveDraft(draft: Omit<DraftComplaint, "savedAt">) {
  try {
    const data: DraftComplaint = { ...draft, savedAt: new Date().toISOString() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota / private-browsing errors
  }
}

/** Load the saved draft, or null */
export function loadDraft(): DraftComplaint | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DraftComplaint;
  } catch {
    return null;
  }
}

/** Remove the saved draft */
export function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore
  }
}

// ─── Offline banner + draft sync ──────────────────────────────────────────────

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    setHasDraft(!!loadDraft());

    const handleOnline = () => {
      setIsOffline(false);
      // Auto-sync draft when back online
      syncDraft();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Also listen to SW broadcast
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "ONLINE") syncDraft();
    };
    navigator.serviceWorker?.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function syncDraft() {
    const draft = loadDraft();
    if (!draft) return;

    setSyncing(true);
    setSyncMsg(null);

    try {
      const fd = new FormData();
      fd.set("title", draft.title);
      fd.set("description", draft.description);
      fd.set("category", draft.category);
      fd.set("priority", draft.priority);

      const result = await createComplaint(null, fd);

      if (result.success) {
        clearDraft();
        setHasDraft(false);
        setSyncMsg("✅ Réclamation hors ligne synchronisée avec succès !");
      } else {
        setSyncMsg(`⚠️ Synchronisation échouée : ${result.message}`);
      }
    } catch {
      setSyncMsg("⚠️ Impossible de synchroniser la réclamation hors ligne.");
    } finally {
      setSyncing(false);
    }
  }

  // Nothing to show when online and no pending draft
  if (!isOffline && !hasDraft && !syncMsg) return null;

  return (
    <div className="space-y-2">
      {/* Offline indicator */}
      {isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <span className="text-lg" aria-hidden="true">📡</span>
          <span>
            <strong>Hors ligne.</strong> Votre réclamation sera envoyée
            automatiquement dès le retour de la connexion.
          </span>
        </div>
      )}

      {/* Pending draft indicator */}
      {hasDraft && !isOffline && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300"
        >
          <span className="text-lg" aria-hidden="true">📝</span>
          <span className="flex-1">
            <strong>Réclamation hors ligne en attente.</strong> Synchronisation en cours…
          </span>
          {syncing && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          )}
        </div>
      )}

      {/* Sync result message */}
      {syncMsg && (
        <div
          role="alert"
          aria-live="assertive"
          className={`rounded-xl border px-4 py-3 text-sm ${
            syncMsg.startsWith("✅")
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
          }`}
        >
          {syncMsg}
        </div>
      )}
    </div>
  );
}
