import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Development-only occupancy link between a test apartment and a tenant.
 *
 * This is the ONLY relationship that grants a tenant access to a test
 * apartment. Search results or favorites are never used as an occupancy proof.
 */
export interface ITestOccupancy {
  propertyId: Types.ObjectId;
  tenantId: Types.ObjectId;
  isActive: boolean;
  startsAt: Date;
  endsAt?: Date;
  isTestData: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TestOccupancySchema = new Schema<ITestOccupancy>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "TestProperty",
      required: true,
      index: true,
    },
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    startsAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
    endsAt: {
      type: Date,
      default: undefined,
    },
    isTestData: {
      type: Boolean,
      required: true,
      default: true,
      immutable: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "testoccupancies",
  },
);

TestOccupancySchema.index({ tenantId: 1, isActive: 1 });
TestOccupancySchema.index({ propertyId: 1, tenantId: 1 }, { unique: true });

const TestOccupancy: Model<ITestOccupancy> =
  (mongoose.models.TestOccupancy as Model<ITestOccupancy>) ||
  mongoose.model<ITestOccupancy>("TestOccupancy", TestOccupancySchema);

export default TestOccupancy;
