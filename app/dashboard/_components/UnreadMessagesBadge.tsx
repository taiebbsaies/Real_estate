"use client";

import { useEffect, useState } from "react";
import { getUnreadTotal } from "@/app/actions/messages";

interface UnreadMessagesBadgeProps {
  initialUnread?: number;
}

export default function UnreadMessagesBadge({
  initialUnread = 0,
}: UnreadMessagesBadgeProps) {
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    let cancelled = false;

    const fetchUnread = async () => {
      const total = await getUnreadTotal();
      if (!cancelled) {
        setUnread(total);
      }
    };

    void fetchUnread();

    const interval = setInterval(() => {
      void fetchUnread();
    }, 20_000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchUnread();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (unread <= 0) {
    return null;
  }

  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
      {unread}
    </span>
  );
}
