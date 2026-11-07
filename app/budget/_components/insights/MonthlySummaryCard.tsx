"use client";

import { useCallback, useEffect, useState } from "react";
import { refreshMonthlySummary } from "@/app/actions/budget-insights";
import type { MonthlySummaryInsight } from "@/lib/budget/insights";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import Card from "../ui/Card";
import { Button } from "../ui/Button";
import { NotebookIcon } from "../icons";

type MonthlySummaryCardProps = {
  month: string;
  initial: MonthlySummaryInsight | null;
};

export default function MonthlySummaryCard({
  month,
  initial,
}: MonthlySummaryCardProps) {
  const [insight, setInsight] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const isOnline = useOnlineStatus();

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailed(false);

    try {
      const state = await refreshMonthlySummary(month);

      if (state.ok) {
        setInsight(state.insight);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    const timer = setTimeout(() => {
      void refresh();
    }, 0);

    return () => clearTimeout(timer);
  }, [isOnline, refresh]);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div className="flex items-center gap-2">
          <NotebookIcon className="h-5 w-5 text-zinc-400" />
          <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
            Résumé du mois
          </h2>
        </div>
        {insight?.source === "ai" && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            Généré par IA
          </span>
        )}
      </div>

      {insight === null && loading && (
        <div className="flex flex-col gap-2" aria-hidden="true">
          <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-11/12 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      )}

      {insight === null && !loading && failed && (
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
          Le résumé est momentanément indisponible.
        </p>
      )}

      {insight === null && !loading && !failed && (
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
          Le résumé sera disponible une fois en ligne.
        </p>
      )}

      {insight !== null && (
        <p
          className={`whitespace-pre-line text-[13px] leading-relaxed text-zinc-700 transition-opacity dark:text-zinc-300 ${
            loading ? "opacity-50" : ""
          }`}
        >
          {insight.text}
        </p>
      )}

      {insight !== null && !isOnline && (
        <p className="text-xs italic text-zinc-500 dark:text-zinc-400">
          Hors ligne — dernière version affichée.
        </p>
      )}

      <div className="flex justify-end">
        <Button
          variant="secondary"
          className="h-9 px-3 text-[11px]"
          onClick={() => void refresh()}
          disabled={!isOnline || loading}
        >
          {loading ? "Actualisation…" : "Actualiser"}
        </Button>
      </div>
    </Card>
  );
}
