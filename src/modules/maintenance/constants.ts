export const MAINTENANCE_STATUSES = [
  "CREEE",
  "EN_ATTENTE",
  "ANNULEE",
  "ACCEPTEE",
  "REJETEE",
  "TECHNICIEN_ASSIGNE",
  "EN_COURS",
  "RESOLUE",
  "CLOTUREE",
  "REOUVERTE",
] as const;

export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const ACTOR_ROLES = [
  "TENANT",
  "OWNER",
  "TECHNICIAN",
  "ADMIN",
  "SYSTEM",
] as const;

export type ActorRole = (typeof ACTOR_ROLES)[number];

export const PRIORITIES = [
  "BASSE",
  "MOYENNE",
  "HAUTE",
  "URGENTE",
] as const;

export type Priority = (typeof PRIORITIES)[number];

export const ASSIGNMENT_STATUSES = [
  "PROPOSED",
  "ACCEPTED",
  "REFUSED",
  "CANCELLED",
] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const PHOTO_TYPES = ["BEFORE", "AFTER"] as const;
export type PhotoType = (typeof PHOTO_TYPES)[number];

export const HISTORY_ACTIONS = [
  "STATUS_CHANGE",
  "ASSIGNMENT",
  "INTERVENTION_UPDATE",
] as const;

export type HistoryAction = (typeof HISTORY_ACTIONS)[number];

export const MAINTENANCE_ERROR_CODES = {
  INVALID_TRANSITION: "INVALID_TRANSITION",
  UNAUTHORIZED_ACTOR: "UNAUTHORIZED_ACTOR",
  REASON_REQUIRED: "REASON_REQUIRED",
  DIAGNOSTIC_REQUIRED: "DIAGNOSTIC_REQUIRED",
  WORK_DONE_REQUIRED: "WORK_DONE_REQUIRED",
  OPTIMISTIC_LOCK_CONFLICT: "OPTIMISTIC_LOCK_CONFLICT",
  REQUEST_NOT_FOUND: "REQUEST_NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

export type MaintenanceErrorCode = keyof typeof MAINTENANCE_ERROR_CODES;

export const STATUS_LABELS: Record<MaintenanceStatus, { fr: string; color: string; badgeClass: string }> = {
  CREEE: {
    fr: "Créée",
    color: "slate",
    badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  },
  EN_ATTENTE: {
    fr: "En attente de validation",
    color: "amber",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  ANNULEE: {
    fr: "Annulée",
    color: "rose",
    badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  },
  ACCEPTEE: {
    fr: "Acceptée par le propriétaire",
    color: "blue",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  REJETEE: {
    fr: "Rejetée",
    color: "red",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  TECHNICIEN_ASSIGNE: {
    fr: "Technicien assigné",
    color: "indigo",
    badgeClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  },
  EN_COURS: {
    fr: "Intervention en cours",
    color: "cyan",
    badgeClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  },
  RESOLUE: {
    fr: "Résolue",
    color: "emerald",
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  CLOTUREE: {
    fr: "Clôturée",
    color: "emerald",
    badgeClass: "bg-emerald-600/20 text-emerald-300 border-emerald-500/30",
  },
  REOUVERTE: {
    fr: "Réouverte",
    color: "orange",
    badgeClass: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
};

export const PRIORITY_CONFIG: Record<Priority, { fr: string; badgeClass: string; dotClass: string }> = {
  BASSE: {
    fr: "Basse",
    badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    dotClass: "bg-slate-400",
  },
  MOYENNE: {
    fr: "Moyenne",
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    dotClass: "bg-blue-400",
  },
  HAUTE: {
    fr: "Haute",
    badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-400",
  },
  URGENTE: {
    fr: "Urgente",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse",
    dotClass: "bg-rose-400",
  },
};
