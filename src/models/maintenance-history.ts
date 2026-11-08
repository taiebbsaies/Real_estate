import { Schema, type Document, type Types } from "mongoose";
import { getOrCreateModel } from "@/src/lib/model";
import {
  ACTOR_ROLES,
  HISTORY_ACTIONS,
  type ActorRole,
  type HistoryAction,
} from "@/src/modules/maintenance/constants";

export interface IMaintenanceHistory extends Document {
  _id: Types.ObjectId;
  requestId: Types.ObjectId;
  propertyId: Types.ObjectId;
  action: HistoryAction;
  fromStatus?: string;
  toStatus?: string;
  actorId?: Types.ObjectId;
  actorRole: ActorRole;
  comment?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

const MaintenanceHistorySchema = new Schema<IMaintenanceHistory>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: "MaintenanceRequest", required: true, index: true },
    propertyId: { type: Schema.Types.ObjectId, ref: "Property", required: true, index: true },
    action: {
      type: String,
      enum: HISTORY_ACTIONS,
      default: "STATUS_CHANGE",
      required: true,
    },
    fromStatus: { type: String },
    toStatus: { type: String },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: {
      type: String,
      enum: ACTOR_ROLES,
      required: true,
    },
    comment: { type: String },
    metadata: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

MaintenanceHistorySchema.index({ propertyId: 1, timestamp: -1 });

export const MaintenanceHistoryModel = getOrCreateModel<IMaintenanceHistory>(
  "MaintenanceHistory",
  MaintenanceHistorySchema
);
export default MaintenanceHistoryModel;
