import { Schema, type Document, type Types } from "mongoose";
import { getOrCreateModel } from "@/src/lib/model";
import { PHOTO_TYPES, type PhotoType } from "@/src/modules/maintenance/constants";

export interface IInterventionPhoto {
  storageKey: string;
  photoType: PhotoType;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

const InterventionPhotoSchema = new Schema<IInterventionPhoto>(
  {
    storageKey: { type: String, required: true },
    photoType: { type: String, enum: PHOTO_TYPES, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

export interface IIntervention extends Document {
  _id: Types.ObjectId;
  requestId: Types.ObjectId;
  technicianId: Types.ObjectId;
  diagnostic: string;
  workDone: string;
  partsReplaced: string[];
  cost: number; // Cost in Tunisian Dinars (DT)
  durationMinutes: number;
  comment?: string;
  startedAt?: Date;
  completedAt?: Date;
  photos: IInterventionPhoto[];
  createdAt: Date;
  updatedAt: Date;
}

const InterventionSchema = new Schema<IIntervention>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: "MaintenanceRequest", required: true, unique: true, index: true },
    technicianId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    diagnostic: { type: String, default: "" },
    workDone: { type: String, default: "" },
    partsReplaced: { type: [String], default: [] },
    cost: { type: Number, default: 0, min: 0 },
    durationMinutes: { type: Number, default: 0, min: 0 },
    comment: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    photos: { type: [InterventionPhotoSchema], default: [] },
  },
  { timestamps: true }
);

export const InterventionModel = getOrCreateModel<IIntervention>("Intervention", InterventionSchema);
export default InterventionModel;
