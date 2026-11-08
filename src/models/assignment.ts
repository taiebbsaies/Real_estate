import { Schema, type Document, type Types } from "mongoose";
import { getOrCreateModel } from "@/src/lib/model";
import { ASSIGNMENT_STATUSES, type AssignmentStatus } from "@/src/modules/maintenance/constants";

export interface IMatchDetails {
  skillScore: number;
  availabilityScore: number;
  distanceScore: number;
  ratingScore: number;
  experienceScore: number;
  distanceKm?: number;
  explanation?: string;
}

export interface IAssignment extends Document {
  _id: Types.ObjectId;
  requestId: Types.ObjectId;
  technicianId: Types.ObjectId;
  proposedBy: Types.ObjectId;
  status: AssignmentStatus;
  matchScore: number;
  matchDetails?: IMatchDetails;
  responseDate?: Date;
  refusalReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentSchema = new Schema<IAssignment>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: "MaintenanceRequest", required: true, index: true },
    technicianId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    proposedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ASSIGNMENT_STATUSES,
      default: "PROPOSED",
      required: true,
      index: true,
    },
    matchScore: { type: Number, default: 0, min: 0, max: 100 },
    matchDetails: {
      skillScore: { type: Number, default: 0 },
      availabilityScore: { type: Number, default: 0 },
      distanceScore: { type: Number, default: 0 },
      ratingScore: { type: Number, default: 0 },
      experienceScore: { type: Number, default: 0 },
      distanceKm: { type: Number },
      explanation: { type: String },
    },
    responseDate: { type: Date },
    refusalReason: { type: String },
  },
  { timestamps: true }
);

AssignmentSchema.index({ requestId: 1, technicianId: 1 });

export const AssignmentModel = getOrCreateModel<IAssignment>("Assignment", AssignmentSchema);
export default AssignmentModel;
