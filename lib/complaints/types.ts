import type {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from "@/lib/constants/complaint";
import type { SerializedTestProperty } from "@/lib/test-properties/types";

export type ComplaintActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  /** True when the complaint was stored locally only (offline draft). */
  localDraft?: boolean;
};

export type SerializedComplaint = {
  _id: string;
  tenantId: string;
  /** Development-only test apartment reference, when the complaint targets one. */
  propertyId?: string;
  /** Resolved test apartment metadata for display in tenant/staff views. */
  property?: SerializedTestProperty;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  technicianId?: string;
  resolutionNotes?: string;
  /** Set when the complaint entered the resolved state. Absent for legacy rows. */
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
};
