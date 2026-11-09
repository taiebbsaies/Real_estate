import "server-only";
import { BlobStorageProvider } from "./blob-storage-provider";
import { CloudinaryStorageProvider } from "./cloudinary-storage-provider";
import { LocalStorageProvider } from "./local-storage-provider";
import type { StorageProvider } from "./storage-provider";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

// Vercel has no persistent disk, so it always uses Blob, like maintenance
// photos. Elsewhere, a Blob token or Cloudinary credentials select that
// provider; with neither, development keeps working on the local disk.
function createStorage(): StorageProvider {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL) {
    return new BlobStorageProvider();
  }
  if (cloudName && apiKey && apiSecret) {
    return new CloudinaryStorageProvider({ cloudName, apiKey, apiSecret });
  }
  return new LocalStorageProvider();
}

export const storage: StorageProvider = createStorage();
