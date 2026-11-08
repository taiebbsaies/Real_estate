import { Schema, type Document, type Types } from "mongoose";
import { getOrCreateModel } from "@/src/lib/model";

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  icon: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    icon: { type: String, default: "Wrench" },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const CategoryModel = getOrCreateModel<ICategory>("Category", CategorySchema);
export default CategoryModel;
