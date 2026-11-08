import { Schema, type Document, type Types } from "mongoose";
import { getOrCreateModel } from "@/src/lib/model";
import {
  MAINTENANCE_STATUSES,
  PRIORITIES,
  type MaintenanceStatus,
  type Priority,
} from "@/src/modules/maintenance/constants";

export interface IRequestPhoto {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

const RequestPhotoSchema = new Schema<IRequestPhoto>(
  {
    storageKey: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

export interface IMaintenanceRequest extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  categoryId: Types.ObjectId;
  propertyId: Types.ObjectId;
  tenantId: Types.ObjectId;
  equipmentId?: Types.ObjectId;
  assignedTechnicianId?: Types.ObjectId;
  priority: Priority;
  status: MaintenanceStatus;
  sourceInspectionItemId?: string;
  photos: IRequestPhoto[];
  rejectionReason?: string;
  reopenReason?: string;
  resolvedAt?: Date;
  closedAt?: Date;
  __v: number;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceRequestSchema = new Schema<IMaintenanceRequest>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    equipmentId: { type: Schema.Types.ObjectId, ref: "Equipment" },
    assignedTechnicianId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    priority: {
      type: String,
      enum: PRIORITIES,
      default: "MOYENNE",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: MAINTENANCE_STATUSES,
      default: "CREEE",
      required: true,
      index: true,
    },
    sourceInspectionItemId: { type: String },
    photos: { type: [RequestPhotoSchema], default: [] },
    rejectionReason: { type: String },
    reopenReason: { type: String },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: "__v", // Enables __v for optimistic locking
  }
);

MaintenanceRequestSchema.index({ propertyId: 1, createdAt: -1 });
MaintenanceRequestSchema.index({ tenantId: 1, createdAt: -1 });
MaintenanceRequestSchema.index({ status: 1, priority: 1 });

export const MaintenanceRequestModel = getOrCreateModel<IMaintenanceRequest>(
  "MaintenanceRequest",
  MaintenanceRequestSchema
);

export default MaintenanceRequestModel;
