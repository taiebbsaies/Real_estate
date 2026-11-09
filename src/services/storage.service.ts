import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { del, get, put } from "@vercel/blob";

export interface StoredFileMetadata {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedAt: Date;
}

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

// Vercel rejects function requests above 4.5 MB, multipart overhead included.
export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB
export const MAX_PHOTOS_PER_REQUEST = 10;

const BLOB_FOLDER = "maintenance";

/** Vercel has no persistent disk, so it always uses Blob. Local development uses disk unless a token is set. */
function usesBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.VERCEL);
}

function blobPath(storageKey: string): string {
  return `${BLOB_FOLDER}/${path.basename(storageKey)}`;
}

function blobOptions() {
  // Set by Vercel when the store is connected to the project.
  return { storeId: process.env.BLOB_READ_WRITE_TOKEN_STORE_ID || undefined };
}

export class StorageService {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(
      /*turbopackIgnore: true*/
      process.cwd(),
      process.env.STORAGE_DIR || "uploads/maintenance"
    );
  }

  private async ensureDir() {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
    } catch {
      // directory already exists
    }
  }

  /**
   * Saves a file with a secure randomized storageKey.
   */
  async saveFile(
    fileBuffer: Buffer | Uint8Array,
    originalName: string,
    mimeType: string
  ): Promise<StoredFileMetadata> {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(
        `Type de fichier non autorisé (${mimeType}). Formats acceptés: JPEG, PNG, WEBP.`
      );
    }

    if (fileBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `Taille de fichier excessive (${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)} Mo). Limite autorisée : 4 Mo.`
      );
    }

    const ext = path.extname(originalName).toLowerCase() || ".jpg";
    const storageKey = `${crypto.randomUUID()}${ext}`;

    if (usesBlob()) {
      await put(blobPath(storageKey), Buffer.from(fileBuffer), {
        ...blobOptions(),
        access: "private",
        contentType: mimeType,
        addRandomSuffix: false,
      });
    } else {
      await this.ensureDir();
      const destinationPath = path.join(/*turbopackIgnore: true*/ this.baseDir, storageKey);
      await fs.writeFile(destinationPath, Buffer.from(fileBuffer));
    }

    return {
      storageKey,
      originalName,
      mimeType,
      sizeBytes: fileBuffer.byteLength,
      uploadedAt: new Date(),
    };
  }

  /**
   * Retrieves a file by its storageKey. Throws when it does not exist.
   */
  async getFile(storageKey: string): Promise<{ buffer: Buffer }> {
    if (usesBlob()) {
      const result = await get(blobPath(storageKey), { ...blobOptions(), access: "private" });
      if (!result || result.statusCode !== 200) {
        throw new Error(`Fichier introuvable : ${storageKey}`);
      }
      return { buffer: Buffer.from(await new Response(result.stream).arrayBuffer()) };
    }

    // Prevent directory traversal attacks
    const sanitizedKey = path.basename(storageKey);
    const filePath = path.join(/*turbopackIgnore: true*/ this.baseDir, sanitizedKey);

    const buffer = await fs.readFile(filePath);
    return { buffer };
  }

  /**
   * Deletes a file from storage.
   */
  async deleteFile(storageKey: string): Promise<void> {
    try {
      if (usesBlob()) {
        await del(blobPath(storageKey), blobOptions());
        return;
      }

      const sanitizedKey = path.basename(storageKey);
      const filePath = path.join(/*turbopackIgnore: true*/ this.baseDir, sanitizedKey);
      await fs.unlink(filePath);
    } catch {
      // file already absent
    }
  }
}

export const storageService = new StorageService();
export default storageService;
