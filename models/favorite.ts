import "server-only";
import mongoose, { Schema, type Model, type Types } from "mongoose";

export interface IFavorite {
  userId: Types.ObjectId;
  propertyId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// A tenant can only favorite a given property once.
FavoriteSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

const Favorite: Model<IFavorite> =
  (mongoose.models.Favorite as Model<IFavorite>) ||
  mongoose.model<IFavorite>("Favorite", FavoriteSchema);

export default Favorite;
