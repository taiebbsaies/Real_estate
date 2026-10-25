"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createComplaint } from "@/app/actions/complaints";
import type { ComplaintCategory, ComplaintPriority } from "@/lib/constants/complaint";

const DRAFT_STORAGE_PREFIX = "homecheck_complaint_drafts:";
const DRAFTS_CHANGED_EVENT = "homecheck:drafts-changed";
const MAX_DRAFTS = 10;
const NO_DRAFTS: DraftComplaint[] = [];

export type DraftComplaint = {
  clientKey: string;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  savedAt: string; // ISO string
};

type SyncMessage = {
  tone: "success" | "error";
  text: string;
};

// ─── Local storage helpers (no authentication data is ever stored) ───────────

function storageKey(ownerId: string): string {
  return `${DRAFT_STORAGE_PREFIX}${ownerId}`;
}

function notifyDraftsChanged() {
  window.dispatchEvent(new Event(DRAFTS_CHANGED_EVENT));
}

function isDraftComplaint(value: unknown): value is DraftComplaint {
  if (typeof value !== "object" || value === null) return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.clientKey === "string" &&
    typeof draft.title === "string" &&
    typeof draft.description === "string" &&
    typeof draft.category === "string" &&
    typeof draft.priority === "string" &&
    typeof draft.savedAt === "string"
  );
}

const snapshotCache = new Map<
  string,
  { raw: string | null; drafts: DraftComplaint[] }
>();

/** Read the queue without returning a new array on every call. */
export function loadDrafts(ownerId: string): DraftComplaint[] {
  try {
    const raw = window.localStorage.getItem(storageKey(ownerId));
    const cached = snapshotCache.get(ownerId);
    if (cached && cached.raw === raw) return cached.drafts;

    let drafts: DraftComplaint[] = [];
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        drafts = parsed.filter(isDraftComplaint);
      }
    }

    snapshotCache.set(ownerId, { raw, drafts });
    return drafts;
  } catch {
    return NO_DRAFTS;
  }
}

/** Add a draft, replacing an existing draft with the same idempotency key. */
export function saveDraft(
  ownerId: string,
  draft: Omit<DraftComplaint, "savedAt">,
): void {
  try {
    const existing = loadDrafts(ownerId).filter(
      (item) => item.clientKey !== draft.clientKey,
    );
    const next: DraftComplaint[] = [
      ...existing,
      { ...draft, savedAt: new Date().toISOString() },
    ].slice(-MAX_DRAFTS);

    window.localStorage.setItem(storageKey(ownerId), JSON.stringify(next));
    notifyDraftsChanged();
  } catch {
    // Ignore quota / private-browsing errors.
  }
}

export function removeDraft(ownerId: string, clientKey: string): void {
  try {
    const next = loadDrafts(ownerId).filter(
      (draft) => draft.clientKey !== clientKey,
    );
    if (next.length === 0) {
      window.localStorage.removeItem(storageKey(ownerId));
    } else {
      window.localStorage.setItem(storageKey(ownerId), JSON.stringify(next));
    }
    notifyDraftsChanged();
  } catch {
    // Ignore.
  }
}

// ─── External store subscriptions ────────────────────────────────────────────

function subscribeDrafts(callback: () => void) {
  window.addEventListener(DRAFTS_CHANGED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(DRAFTS_CHANGED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerOnlineSnapshot() {
  return true;
}

// ─── Offline banner + draft sync ─────────────────────────────────────────────

interface OfflineBannerProps {
  ownerId: string;
}

export default function OfflineBanner({ ownerId }: OfflineBannerProps) {
  const router = useRouter();
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerOnlineSnapshot,
  );
  const getDraftSnapshot = useCallback(
    () => loadDrafts(ownerId).length,
    [ownerId],
  );
  const draftCount = useSyncExternalStore(
    subscribeDrafts,
    getDraftSnapshot,
    () => 0,
  );

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<SyncMessage | null>(null);
  const inFlight = useRef(false);

  const syncDrafts = useCallback(async () => {
    if (inFlight.current || !navigator.onLine) return;

    const drafts = loadDrafts(ownerId);
    if (drafts.length === 0) return;

    inFlight.current = true;
    setSyncing(true);

    let synced = 0;

    try {
      for (const draft of drafts) {
        const formData = new FormData();
        formData.set("title", draft.title);
        formData.set("description", draft.description);
        formData.set("category", draft.category);
        formData.set("priority", draft.priority);
        // The same key is reused on every attempt: the server rejects duplicates.
        formData.set("clientKey", draft.clientKey);

        const result = await createComplaint(null, formData);

        if (!result.success) {
          const remaining = drafts.length - synced;
          setSyncMessage({
            tone: "error",
            text: `${result.message} ${remaining} brouillon${remaining > 1 ? "s" : ""} conservé${remaining > 1 ? "s" : ""} localement. Vous pourrez réessayer.`,
          });
          return;
        }

        removeDraft(ownerId, draft.clientKey);
        synced += 1;
      }

      if (synced > 0) {
        setSyncMessage({
          tone: "success",
          text: `${synced} réclamation${synced > 1 ? "s" : ""} hors ligne synchronisée${synced > 1 ? "s" : ""} avec succès.`,
        });
        router.refresh();
      }
    } catch {
      setSyncMessage({
        tone: "error",
        text: "Connexion interrompue. Les brouillons sont conservés localement et seront réessayés.",
      });
    } finally {
      inFlight.current = false;
      setSyncing(false);
    }
  }, [ownerId, router]);

  // Retry on page load / next visit, when connectivity returns, and while a
  // local draft remains. Background Sync is not used, so this is honest
  // foreground retry behaviour.
  useEffect(() => {
    if (!isOnline || draftCount === 0) return;

    const timer = window.setTimeout(() => {
      void syncDrafts();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [draftCount, isOnline, syncDrafts]);

  const showBanner = !isOnline || draftCount > 0 || syncMessage !== null;
  if (!showBanner) return null;

  return (
    <div className="space-y-2">
      {!isOnline && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
        >
          <span className="text-lg" aria-hidden="true">📡</span>
          <span>
            <strong>Hors ligne.</strong>{" "}
            {draftCount > 0
              ? `${draftCount} brouillon${draftCount > 1 ? "s" : ""} enregistré${draftCount > 1 ? "s" : ""} uniquement sur cet appareil. `
              : "Vous pouvez préparer une réclamation : elle sera enregistrée localement. "}
            La synchronisation se fera au retour de la connexion.
          </span>
        </div>
      )}

      {isOnline && draftCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300"
        >
          <span className="text-lg" aria-hidden="true">📝</span>
          <span className="flex-1">
            <strong>
              {draftCount} brouillon{draftCount > 1 ? "s" : ""} local
              {draftCount > 1 ? "aux" : ""} en attente.
            </strong>{" "}
            Pas encore enregistré{draftCount > 1 ? "s" : ""} sur le serveur.
            {syncing ? " Synchronisation en cours…" : " Synchronisation automatique dès que possible."}
          </span>
          {syncing ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <button
              type="button"
              onClick={() => void syncDrafts()}
              className="rounded-lg border border-blue-300 bg-white/70 px-3 py-1 text-xs font-semibold text-blue-800 hover:bg-white dark:border-blue-700 dark:bg-blue-900/40 dark:text-blue-200 dark:hover:bg-blue-900/70"
            >
              Réessayer maintenant
            </button>
          )}
        </div>
      )}

      {syncMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className={`rounded-xl border px-4 py-3 text-sm ${
            syncMessage.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300"
          }`}
        >
          {syncMessage.text}
        </div>
      )}
    </div>
  );
}
