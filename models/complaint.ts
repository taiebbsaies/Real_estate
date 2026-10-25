import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  type ComplaintCategory,
  type ComplaintPriority,
  type ComplaintStatus,
} from "@/lib/constants/complaint";

export type {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
} from "@/lib/constants/complaint";

export interface IComplaint {
  tenantId: Types.ObjectId;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  technicianId?: Types.ObjectId;
  resolutionNotes?: string;
  /**
   * Client-generated idempotency key. Used by the offline draft queue so a
   * retry after a lost response cannot create a duplicate complaint.
   */
  clientKey?: string;
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

    clientKey: {
      type: String,
      trim: true,
      maxlength: 100,
      default: undefined,
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
// Idempotency: one complaint per tenant and client-generated key
ComplaintSchema.index(
  { tenantId: 1, clientKey: 1 },
  {
    unique: true,
    partialFilterExpression: { clientKey: { $type: "string" } },
  },
);

const Complaint: Model<IComplaint> =
  (mongoose.models.Complaint as Model<IComplaint>) ||
  mongoose.model<IComplaint>("Complaint", ComplaintSchema);

export default Complaint;
