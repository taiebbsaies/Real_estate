import React from "react";
import { type MaintenanceStatus } from "@/src/modules/maintenance/constants";
import { Check, Clock, AlertTriangle, XCircle, RotateCcw } from "lucide-react";

interface StatusTimelineProps {
  currentStatus: MaintenanceStatus;
  createdAt?: string | Date;
  resolvedAt?: string | Date;
  closedAt?: string | Date;
}

const STEPS = [
  { key: "SIGNALEE", label: "Signalement", sub: "Locataire" },
  { key: "VALIDEE", label: "Validation", sub: "Propriétaire" },
  { key: "ASSIGNEE", label: "Assignation", sub: "Technicien" },
  { key: "EN_COURS", label: "Travaux", sub: "Sur place" },
  { key: "RESOLUE", label: "Résolue", sub: "Diagnostic & Coût" },
  { key: "CLOTUREE", label: "Clôturée", sub: "Vérifiée" },
];

export function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  // Map current status to step index (0 to 5)
  const getActiveStepIndex = (): number => {
    switch (currentStatus) {
      case "CREEE":
      case "EN_ATTENTE":
        return 0;
      case "ACCEPTEE":
        return 1;
      case "TECHNICIEN_ASSIGNE":
        return 2;
      case "EN_COURS":
        return 3;
      case "RESOLUE":
        return 4;
      case "CLOTUREE":
        return 5;
      case "REOUVERTE":
        return 1; // Reopened goes back to validation/assignment
      case "ANNULEE":
      case "REJETEE":
        return -1;
      default:
        return 0;
    }
  };

  const activeIndex = getActiveStepIndex();
  const isRejected = currentStatus === "REJETEE";
  const isCancelled = currentStatus === "ANNULEE";
  const isReopened = currentStatus === "REOUVERTE";

  if (isRejected || isCancelled) {
    return (
      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex items-center gap-3">
        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
        <div>
          <h4 className="font-semibold text-sm">
            {isRejected ? "Demande Rejetée par le bailleur" : "Demande Annulée"}
          </h4>
          <p className="text-xs text-rose-200/80">
            Le cycle de vie de cette demande a été interrompu.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-4">
      {isReopened && (
        <div className="mb-4 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300 flex items-center gap-2 text-xs">
          <RotateCcw className="w-4 h-4 text-orange-400 shrink-0" />
          <span>Demande réouverte suite à une insatisfaction. En attente de révision.</span>
        </div>
      )}

      {/* Progress Bar / Steps Container */}
      <div className="relative flex items-center justify-between">
        {/* Continuous Connecting Line */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 -z-0" />
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 transition-all duration-500 -z-0"
          style={{
            width: `${Math.min(100, Math.max(0, (activeIndex / (STEPS.length - 1)) * 100))}%`,
          }}
        />

        {STEPS.map((step, idx) => {
          const isDone = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          let circleStyle = "bg-slate-800 text-slate-400 border-slate-700";
          if (isDone) {
            circleStyle = "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/30";
          } else if (isCurrent) {
            circleStyle = "bg-blue-600 text-white border-blue-400 ring-4 ring-blue-500/20 animate-pulse";
          }

          return (
            <div key={step.key} className="flex flex-col items-center z-10">
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${circleStyle}`}
              >
                {isDone ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : isCurrent ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={`text-xs font-medium ${
                    isCurrent ? "text-blue-400 font-semibold" : isDone ? "text-slate-200" : "text-slate-500"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-[10px] text-slate-500 hidden sm:block">{step.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StatusTimeline;
