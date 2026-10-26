import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Development-only apartment used to exercise the complaints module.
 *
 * Deliberately isolated from any future production property model: it lives in
 * its own `testproperties` collection and every document is flagged with
 * `isTestData`. It is never exposed unless ENABLE_TEST_PROPERTIES is set in a
 * non-production environment.
 */
export interface ITestProperty {
  code: string;
  label: string;
  address: string;
  city: string;
  ownerId: Types.ObjectId;
  isTestData: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TestPropertySchema = new Schema<ITestProperty>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 40,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
    collection: "testproperties",
  },
);

TestPropertySchema.index({ isTestData: 1, code: 1 });
TestPropertySchema.index({ ownerId: 1, isTestData: 1 });

const TestProperty: Model<ITestProperty> =
  (mongoose.models.TestProperty as Model<ITestProperty>) ||
  mongoose.model<ITestProperty>("TestProperty", TestPropertySchema);

export default TestProperty;
