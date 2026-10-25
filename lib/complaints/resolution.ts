import type { ComplaintStatus } from "@/lib/constants/complaint";

export type ResolutionTimestampUpdate = {
  /** Set only when the complaint enters the resolved state for the first time. */
  setResolvedAt?: Date;
  /** Remove the timestamp when the complaint leaves the resolved state. */
  clearResolvedAt?: boolean;
};

/**
 * Centralise the resolvedAt rules so status transitions cannot drift:
 * - entering "resolved" records the current time;
 * - a notes-only edit on an already resolved complaint keeps the original time;
 * - leaving "resolved" clears the stale timestamp;
 * - legacy resolved complaints are never backfilled.
 */
export function getResolutionTimestampUpdate(
  currentStatus: ComplaintStatus,
  nextStatus: ComplaintStatus,
  now: Date = new Date(),
): ResolutionTimestampUpdate {
  if (nextStatus === "resolved") {
    return currentStatus === "resolved" ? {} : { setResolvedAt: now };
  }
  return { clearResolvedAt: true };
}
