"use client";

import { useCallback, useEffect, useState } from "react";
import { refreshPredictiveAlerts } from "@/app/actions/budget-insights";
import type { PredictiveAlertsInsight } from "@/lib/budget/projections";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import Card from "../ui/Card";
import { Button } from "../ui/Button";
import { AlertTriangleIcon, CategoryIcon, CheckCircleIcon } from "../icons";

type PredictiveAlertsCardProps = {
  month: string;
  initial: PredictiveAlertsInsight | null;
};

export default function PredictiveAlertsCard({
  month,
  initial,
}: PredictiveAlertsCardProps) {
  const [insight, setInsight] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const isOnline = useOnlineStatus();

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailed(false);

    try {
      const state = await refreshPredictiveAlerts(month);

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

  const alerts = insight?.alerts ?? [];

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <AlertTriangleIcon className="h-5 w-5 text-zinc-400" />
        <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
          Alertes de dépassement
        </h2>
      </div>

      {insight === null && loading && (
        <div className="flex flex-col gap-2" aria-hidden="true">
          <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>
      )}

      {insight === null && !loading && failed && (
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
          Les alertes sont momentanément indisponibles.
        </p>
      )}

      {insight === null && !loading && !failed && (
        <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
          Les alertes seront disponibles une fois en ligne.
        </p>
      )}

      {insight !== null && alerts.length === 0 && (
        <p className="flex items-center gap-2 text-[13px] text-emerald-600 dark:text-emerald-400">
          <CheckCircleIcon className="h-4 w-4 shrink-0" />
          Aucun risque de dépassement détecté pour le moment.
        </p>
      )}

      {alerts.length > 0 && (
        <ul
          className={`flex flex-col gap-3 transition-opacity ${
            loading ? "opacity-50" : ""
          }`}
        >
          {alerts.map((alert) => (
            <li key={alert.key} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-xs dark:bg-zinc-800">
                <CategoryIcon
                  category={alert.key}
                  className={
                    alert.level === "exceeded"
                      ? "h-5 w-5 text-red-600 dark:text-red-400"
                      : "h-5 w-5 text-amber-600 dark:text-amber-400"
                  }
                />
              </div>
              <p className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                {alert.text}
              </p>
            </li>
          ))}
        </ul>
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
