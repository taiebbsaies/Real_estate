import React from "react";
import { type Priority, PRIORITY_CONFIG } from "@/src/modules/maintenance/constants";

interface PriorityTagProps {
  priority: Priority;
  className?: string;
}

export function PriorityTag({ priority, className = "" }: PriorityTagProps) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.MOYENNE;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.badgeClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      <span>{config.fr}</span>
    </span>
  );
}

export default PriorityTag;
