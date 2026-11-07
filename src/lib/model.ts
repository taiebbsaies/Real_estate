import mongoose, { Model, Schema } from "mongoose";

/**
 * Safe Mongoose model getter / creator that prevents recompilation errors
 * during Next.js Hot Module Replacement (HMR) and fast refresh.
 */
export function getOrCreateModel<T>(name: string, schema: Schema<T>): Model<T> {
  if (mongoose.models && mongoose.models[name]) {
    return mongoose.models[name] as Model<T>;
  }
  return mongoose.model<T>(name, schema);
}
