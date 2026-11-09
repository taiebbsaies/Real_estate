import "server-only";
import { CloudinaryStorageProvider } from "./cloudinary-storage-provider";
import { LocalStorageProvider } from "./local-storage-provider";
import type { StorageProvider } from "./storage-provider";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

// Production uses Cloudinary when fully configured; otherwise keep the local
// provider so development keeps working without any credentials.
export const storage: StorageProvider =
  cloudName && apiKey && apiSecret
    ? new CloudinaryStorageProvider({ cloudName, apiKey, apiSecret })
    : new LocalStorageProvider();
