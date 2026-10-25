export const COMPLAINT_CATEGORIES = [
  "plumbing",
  "electricity",
  "heating",
  "structural",
  "noise",
  "common_areas",
  "other",
] as const;

export const COMPLAINT_PRIORITIES = [
  "low",
  "medium",
  "high",
  "urgent",
] as const;

export const COMPLAINT_STATUSES = [
  "pending",
  "in_progress",
  "resolved",
  "rejected",
] as const;

export type ComplaintCategory = (typeof COMPLAINT_CATEGORIES)[number];
export type ComplaintPriority = (typeof COMPLAINT_PRIORITIES)[number];
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];

/**
 * Allowed status transitions for staff members.
 * Keeping this list shared between the server and the UI means the options
 * displayed in a form always match what the server will accept.
 */
export const COMPLAINT_STATUS_TRANSITIONS: Record<
  ComplaintStatus,
  readonly ComplaintStatus[]
> = {
  pending: ["in_progress", "rejected"],
  in_progress: ["resolved", "rejected"],
  resolved: ["in_progress"],
  rejected: ["pending"],
};

/** Current status (for notes-only edits) plus every allowed next status. */
export function getAllowedStatusOptions(
  currentStatus: ComplaintStatus,
): ComplaintStatus[] {
  return [currentStatus, ...COMPLAINT_STATUS_TRANSITIONS[currentStatus]];
}

export function isComplaintStatusTransitionAllowed(
  from: ComplaintStatus,
  to: ComplaintStatus,
): boolean {
  return from === to || COMPLAINT_STATUS_TRANSITIONS[from].includes(to);
}
