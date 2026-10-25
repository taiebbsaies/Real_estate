import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

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

export interface IComplaint {
  tenantId: Types.ObjectId;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  technicianId?: Types.ObjectId;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema = new Schema<IComplaint>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },

    category: {
      type: String,
      enum: COMPLAINT_CATEGORIES,
      required: true,
    },

    priority: {
      type: String,
      enum: COMPLAINT_PRIORITIES,
      required: true,
      default: "medium",
    },

    status: {
      type: String,
      enum: COMPLAINT_STATUSES,
      required: true,
      default: "pending",
    },

    technicianId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
    },

    resolutionNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// Compound index for tenant's complaints sorted by date
ComplaintSchema.index({ tenantId: 1, createdAt: -1 });
// Index for staff views filtered by status
ComplaintSchema.index({ status: 1, createdAt: -1 });

const Complaint: Model<IComplaint> =
  (mongoose.models.Complaint as Model<IComplaint>) ||
  mongoose.model<IComplaint>("Complaint", ComplaintSchema);

export default Complaint;
