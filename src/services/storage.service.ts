import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

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

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PHOTOS_PER_REQUEST = 10;

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
   * Saves a file buffer or Blob to local disk with a secure randomized storageKey.
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
        `Taille de fichier excessive (${(fileBuffer.byteLength / 1024 / 1024).toFixed(1)} Mo). Limite autorisée: 5 Mo.`
      );
    }

    await this.ensureDir();

    const ext = path.extname(originalName).toLowerCase() || ".jpg";
    const storageKey = `${crypto.randomUUID()}${ext}`;
    const destinationPath = path.join(/*turbopackIgnore: true*/ this.baseDir, storageKey);

    await fs.writeFile(destinationPath, Buffer.from(fileBuffer));

    return {
      storageKey,
      originalName,
      mimeType,
      sizeBytes: fileBuffer.byteLength,
      uploadedAt: new Date(),
    };
  }

  /**
   * Retrieves a file from local storage by its storageKey.
   */
  async getFile(storageKey: string): Promise<{ buffer: Buffer; filePath: string }> {
    // Prevent directory traversal attacks
    const sanitizedKey = path.basename(storageKey);
    const filePath = path.join(/*turbopackIgnore: true*/ this.baseDir, sanitizedKey);

    const buffer = await fs.readFile(filePath);
    return { buffer, filePath };
  }

  /**
   * Deletes a file from storage.
   */
  async deleteFile(storageKey: string): Promise<void> {
    try {
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
