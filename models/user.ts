/**
 * @deprecated Use `UserModel` and `IUser` from `@/src/models/shared` instead.
 * This file is kept for backward compatibility only and re-exports from the
 * canonical shared model to prevent duplicate Mongoose model registration.
 */
export { UserModel as default, type IUser } from "@/src/models/shared";
