import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_CLASSIFICATION_SOURCES,
  COMPLAINT_CLASSIFICATION_STATUSES,
  COMPLAINT_PRIORITIES,
  COMPLAINT_STATUSES,
  type ComplaintCategory,
  type ComplaintClassificationSource,
  type ComplaintClassificationStatus,
  type ComplaintPriority,
  type ComplaintStatus,
} from "@/lib/constants/complaint";

export type {
  ComplaintCategory,
  ComplaintClassificationSource,
  ComplaintClassificationStatus,
  ComplaintPriority,
  ComplaintStatus,
} from "@/lib/constants/complaint";

export interface IComplaint {
  tenantId: Types.ObjectId;
  /**
   * Optional development-only test apartment reference. Legacy complaints that
   * do not target a specific apartment simply omit this field.
   */
  propertyId?: Types.ObjectId;
  title: string;
  description: string;
  category: ComplaintCategory;
  priority: ComplaintPriority;
  /**
   * Whether the automatic classification completed successfully. Complaints
   * created before automatic classification have no value and are treated as
   * completed by the serializers (they were classified manually).
   */
  classificationStatus?: ComplaintClassificationStatus;
  classificationSource?: ComplaintClassificationSource;
  /** French justification of the priority, written by the AI provider. */
  aiExplanation?: string;
  /** Concrete intervention recommended by the AI provider. */
  recommendedAction?: string;
  classifiedAt?: Date;
  status: ComplaintStatus;
  technicianId?: Types.ObjectId;
  resolutionNotes?: string;
  /**
   * Timestamp of the transition to "resolved". Kept separate from updatedAt so
   * reporting never has to infer a resolution date from unrelated edits.
   * Legacy resolved complaints have no value and are excluded from averages.
   */
  resolvedAt?: Date;
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

    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "TestProperty",
      default: undefined,
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

    classificationStatus: {
      type: String,
      enum: COMPLAINT_CLASSIFICATION_STATUSES,
      default: "needs_review",
      index: true,
    },

    classificationSource: {
      type: String,
      enum: COMPLAINT_CLASSIFICATION_SOURCES,
      default: undefined,
    },

    aiExplanation: {
      type: String,
      trim: true,
      maxlength: 600,
    },

    recommendedAction: {
      type: String,
      trim: true,
      maxlength: 600,
    },

    classifiedAt: {
      type: Date,
      default: undefined,
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

    resolvedAt: {
      type: Date,
      default: undefined,
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
// Staff views filtering by the development-only test apartment
ComplaintSchema.index({ propertyId: 1, createdAt: -1 });
// Index for staff views filtered by status
ComplaintSchema.index({ status: 1, createdAt: -1 });
// Staff review queue: complaints whose automatic classification needs a human.
ComplaintSchema.index({ classificationStatus: 1, createdAt: -1 });
// Statistics: period reports filter on creation date without a status filter.
ComplaintSchema.index({ createdAt: -1 });
// Statistics: average resolution time filters resolved complaints by resolvedAt.
ComplaintSchema.index({ status: 1, resolvedAt: -1 });
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
