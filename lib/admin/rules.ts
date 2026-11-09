export const ADMIN_PAGE_SIZE = 25;
export const STUCK_AFTER_DAYS = 7;

// Requests in these statuses still need someone to act on them.
export const OPEN_REQUEST_STATUSES = [
  "CREEE",
  "EN_ATTENTE",
  "ACCEPTEE",
  "TECHNICIEN_ASSIGNE",
  "EN_COURS",
  "REOUVERTE",
] as const;

// The technician can only be changed before the work has started.
export const ASSIGNABLE_REQUEST_STATUSES = ["ACCEPTEE", "TECHNICIEN_ASSIGNE"] as const;

export const TECHNICIAN_VERIFICATION_LABELS = {
  PENDING: "En attente",
  APPROVED: "Validé",
  REJECTED: "Refusé",
} as const;

/** Returns why this account cannot be suspended, or null when it can. */
export function getSuspensionBlocker(params: {
  actorId: string;
  targetId: string;
  targetIsActiveAdmin: boolean;
  activeAdminCount: number;
}): string | null {
  if (params.actorId === params.targetId) {
    return "Vous ne pouvez pas suspendre votre propre compte.";
  }
  if (params.targetIsActiveAdmin && params.activeAdminCount <= 1) {
    return "Impossible de suspendre le dernier administrateur actif.";
  }
  return null;
}

export function stuckCutoffDate(now: number = Date.now()): Date {
  return new Date(now - STUCK_AFTER_DAYS * 24 * 60 * 60 * 1000);
}

export function isRequestStuck(status: string, updatedAt: Date, now: number = Date.now()): boolean {
  return (
    (OPEN_REQUEST_STATUSES as readonly string[]).includes(status) &&
    updatedAt < stuckCutoffDate(now)
  );
}

/** Makes user input safe to use inside a MongoDB regular expression. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}
