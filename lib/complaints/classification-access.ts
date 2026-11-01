import type { UserRole } from "@/lib/constants/user";

/**
 * Only staff roles may correct an automatically generated classification.
 * Tenants can never change category or priority, including through forged
 * server-action calls.
 */
export function canCorrectComplaintClassification(
  role: UserRole | null | undefined,
): boolean {
  return role === "OWNER" || role === "TECHNICIAN" || role === "ADMIN";
}
