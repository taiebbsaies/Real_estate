import React from "react";
import { type MaintenanceStatus, STATUS_LABELS } from "@/src/modules/maintenance/constants";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Wrench,
  RotateCcw,
  CheckCheck,
} from "lucide-react";

interface StatusBadgeProps {
  status: MaintenanceStatus;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className = "", showIcon = true }: StatusBadgeProps) {
  const config = STATUS_LABELS[status] || STATUS_LABELS.CREEE;

  const getIcon = () => {
    switch (status) {
      case "CREEE":
      case "EN_ATTENTE":
        return <Clock className="w-3.5 h-3.5" />;
      case "ACCEPTEE":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "REJETEE":
      case "ANNULEE":
        return <XCircle className="w-3.5 h-3.5" />;
      case "TECHNICIEN_ASSIGNE":
      case "EN_COURS":
        return <Wrench className="w-3.5 h-3.5" />;
      case "RESOLUE":
        return <CheckCheck className="w-3.5 h-3.5" />;
      case "CLOTUREE":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "REOUVERTE":
        return <RotateCcw className="w-3.5 h-3.5" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.badgeClass} ${className}`}
    >
      {showIcon && getIcon()}
      <span>{config.fr}</span>
    </span>
  );
}

export default StatusBadge;
