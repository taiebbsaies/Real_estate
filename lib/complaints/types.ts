import type {
  ComplaintCategory,
  ComplaintClassificationSource,
  ComplaintClassificationStatus,
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
  /** "needs_review" when the automatic classification could not be trusted. */
  classificationStatus: ComplaintClassificationStatus;
  classificationSource?: ComplaintClassificationSource;
  /** French justification of the priority, when the AI succeeded. */
  aiExplanation?: string;
  /** Concrete intervention recommended by the AI, when it succeeded. */
  recommendedAction?: string;
  classifiedAt?: string;
  status: ComplaintStatus;
  technicianId?: string;
  resolutionNotes?: string;
  /** Set when the complaint entered the resolved state. Absent for legacy rows. */
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
};
