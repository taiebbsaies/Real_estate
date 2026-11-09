import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { StorageProvider } from "./storage-provider";

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

const UPLOAD_TIMEOUT_MS = 30_000;
const DESTROY_TIMEOUT_MS = 10_000;

const CONTENT_TYPES: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function sign(params: Record<string, string>, apiSecret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${payload}${apiSecret}`).digest("hex");
}

function readSecureUrl(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }
  const record = payload as Record<string, unknown>;
  return typeof record.secure_url === "string" ? record.secure_url : null;
}

/**
 * Cloudinary provider using the unsigned-SDK-free signed upload flow:
 * SHA-1 of the alphabetically sorted params plus the API secret.
 * The API secret never leaves the server and is never logged.
 */
export class CloudinaryStorageProvider implements StorageProvider {
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(config: CloudinaryConfig) {
    this.cloudName = config.cloudName;
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
  }

  async save(
    buffer: Buffer,
    { propertyId, extension }: { propertyId: string; extension: string },
  ): Promise<string> {
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = `properties/${propertyId}/${randomUUID()}`;
    const signature = sign(
      { public_id: publicId, timestamp: String(timestamp) },
      this.apiSecret,
    );

    const form = new FormData();
    form.set(
      "file",
      new Blob([new Uint8Array(buffer)], {
        type: CONTENT_TYPES[extension] ?? "application/octet-stream",
      }),
      `image.${extension}`,
    );
    form.set("api_key", this.apiKey);
    form.set("timestamp", String(timestamp));
    form.set("public_id", publicId);
    form.set("signature", signature);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`,
        {
          method: "POST",
          body: form,
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(`Cloudinary upload failed (${response.status}).`);
      }

      const payload: unknown = await response.json();
      const secureUrl = readSecureUrl(payload);
      if (!secureUrl || !secureUrl.startsWith("https://res.cloudinary.com/")) {
        throw new Error("Cloudinary upload returned no usable URL.");
      }

      return secureUrl;
    } finally {
      clearTimeout(timeout);
    }
  }

  async delete(url: string): Promise<void> {
    try {
      const publicId = this.publicIdFromUrl(url);
      if (!publicId) {
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const signature = sign(
        { public_id: publicId, timestamp: String(timestamp) },
        this.apiSecret,
      );

      const form = new FormData();
      form.set("public_id", publicId);
      form.set("api_key", this.apiKey);
      form.set("timestamp", String(timestamp));
      form.set("signature", signature);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DESTROY_TIMEOUT_MS);

      try {
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${this.cloudName}/image/destroy`,
          {
            method: "POST",
            body: form,
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          console.error(
            "[CloudinaryStorageProvider] delete failed:",
            response.status,
          );
        }
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: unknown) {
      console.error(
        "[CloudinaryStorageProvider] delete error:",
        error instanceof Error ? error.name : "UnknownError",
      );
    }
  }

  private publicIdFromUrl(url: string): string | null {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }

    if (parsed.hostname !== "res.cloudinary.com") {
      return null;
    }

    const marker = `/${this.cloudName}/image/upload/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) {
      return null;
    }

    const rest = parsed.pathname
      .slice(index + marker.length)
      .replace(/^v\d+\//, "");
    const publicId = rest.replace(/\.(?:jpe?g|png|webp)$/i, "");

    return publicId.startsWith("properties/") ? publicId : null;
  }
}
