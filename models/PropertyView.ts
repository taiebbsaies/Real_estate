import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IPropertyView {
  propertyId: Types.ObjectId;
  viewerId: Types.ObjectId;
  day: string;
  createdAt: Date;
}

const PropertyViewSchema = new Schema<IPropertyView>(
  {
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    viewerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    day: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
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

PropertyViewSchema.index(
  { propertyId: 1, viewerId: 1, day: 1 },
  { unique: true },
);

const PropertyView: Model<IPropertyView> =
  (mongoose.models.PropertyView as Model<IPropertyView>) ||
  mongoose.model<IPropertyView>("PropertyView", PropertyViewSchema);

export default PropertyView;
