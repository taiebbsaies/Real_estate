import "server-only";
import { randomUUID } from "node:crypto";
import { del, get, put } from "@vercel/blob";
import type { StorageProvider } from "./storage-provider";

const BLOB_FOLDER = "properties";
const ROUTE_PREFIX = "/api/property-images";

const CONTENT_TYPES: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const PROPERTY_ID_PATTERN = /^[a-f\d]{24}$/i;
const FILENAME_PATTERN = /^[a-f\d-]{36}\.(jpeg|png|webp)$/i;

function blobOptions() {
  // Set by Vercel when the store is connected to the project.
  return { storeId: process.env.BLOB_READ_WRITE_TOKEN_STORE_ID || undefined };
}

export function isValidPropertyImagePath(
  propertyId: string,
  filename: string,
): boolean {
  return PROPERTY_ID_PATTERN.test(propertyId) && FILENAME_PATTERN.test(filename);
}

export function propertyImageContentType(filename: string): string {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

/** Reads an image from the private store. Returns null when it does not exist. */
export async function readPropertyImage(
  propertyId: string,
  filename: string,
): Promise<ReadableStream<Uint8Array> | null> {
  const result = await get(`${BLOB_FOLDER}/${propertyId}/${filename}`, {
    ...blobOptions(),
    access: "private",
  });
  if (!result || result.statusCode !== 200) {
    return null;
  }
  return result.stream;
}

/**
 * Stores listing photos in the private Vercel Blob store, like maintenance
 * photos. The saved URL points to the route that streams them back.
 */
export class BlobStorageProvider implements StorageProvider {
  async save(
    buffer: Buffer,
    { propertyId, extension }: { propertyId: string; extension: string },
  ): Promise<string> {
    const filename = `${randomUUID()}.${extension}`;
    await put(`${BLOB_FOLDER}/${propertyId}/${filename}`, buffer, {
      ...blobOptions(),
      access: "private",
      contentType: CONTENT_TYPES[extension] ?? "application/octet-stream",
      addRandomSuffix: false,
    });
    return `${ROUTE_PREFIX}/${propertyId}/${filename}`;
  }

  async delete(url: string): Promise<void> {
    // Ignore URLs managed by another provider (legacy local or Cloudinary records).
    if (!url.startsWith(`${ROUTE_PREFIX}/`)) {
      return;
    }
    const [propertyId, filename] = url
      .slice(ROUTE_PREFIX.length + 1)
      .split("?")[0]
      .split("/");
    if (!isValidPropertyImagePath(propertyId ?? "", filename ?? "")) {
      return;
    }
    try {
      await del(`${BLOB_FOLDER}/${propertyId}/${filename}`, blobOptions());
    } catch (error: unknown) {
      console.error(
        "[BlobStorageProvider] delete error:",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
  }
}
