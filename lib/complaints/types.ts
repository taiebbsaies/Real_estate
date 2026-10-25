import type {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from "@/lib/constants/complaint";

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
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  technicianId?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
};
