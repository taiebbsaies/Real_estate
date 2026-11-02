import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";
import { reportReasons, type ReportReason } from "@/lib/validations/report";

export const REPORT_STATUSES = ["open", "dismissed", "actioned"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface IReport {
  propertyId: Types.ObjectId;
  reporterId: Types.ObjectId;
  reason: ReportReason;
  comment?: string;
  status: ReportStatus;
  handledBy?: Types.ObjectId;
  handledAt?: Date;
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reason: {
      type: String,
      enum: reportReasons,
      required: true,
    },
    comment: {
      type: String,
      trim: true,
      minlength: 10,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      required: true,
      default: "open",
    },
    handledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    handledAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

ReportSchema.index({ propertyId: 1, reporterId: 1 }, { unique: true });
ReportSchema.index({ status: 1, createdAt: -1 });

const Report: Model<IReport> =
  (mongoose.models.Report as Model<IReport>) ||
  mongoose.model<IReport>("Report", ReportSchema);

export default Report;
