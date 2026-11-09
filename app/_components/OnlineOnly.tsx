"use client";

import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import OfflineMessage from "@/app/offline/OfflineMessage";

/** Swaps its content for the offline message when the connection drops on an open page. */
export default function OnlineOnly({ children }: { children: React.ReactNode }) {
  return useOnlineStatus() ? children : <OfflineMessage />;
}
