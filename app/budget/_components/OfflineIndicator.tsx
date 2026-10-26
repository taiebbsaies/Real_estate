"use client";

import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-label="État de la connexion"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center px-4 pt-2 md:pl-[260px]"
    >
      <p className="pointer-events-auto rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/60 dark:text-amber-300">
        Hors ligne
      </p>
    </div>
  );
}
