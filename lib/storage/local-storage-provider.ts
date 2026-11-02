import "server-only";
import { randomUUID } from "crypto";
import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import type { StorageProvider } from "./storage-provider";

const PUBLIC_ROOT = path.join(process.cwd(), "public");

export class LocalStorageProvider implements StorageProvider {
  async save(
    buffer: Buffer,
    { propertyId, extension }: { propertyId: string; extension: string },
  ): Promise<string> {
    const directory = path.join(
      PUBLIC_ROOT,
      "uploads",
      "properties",
      propertyId,
    );
    await mkdir(directory, { recursive: true });
    const filename = `${randomUUID()}.${extension}`;
    await writeFile(path.join(directory, filename), buffer);
    return `/uploads/properties/${propertyId}/${filename}`;
  }

  async delete(url: string): Promise<void> {
    const relative = url.split("?")[0].replace(/^\/+/, "");
    const filePath = path.resolve(PUBLIC_ROOT, relative);
    const rootWithSeparator = PUBLIC_ROOT + path.sep;
    if (!filePath.startsWith(rootWithSeparator)) {
      throw new Error("Invalid storage path.");
    }
    await rm(filePath, { force: true });
  }
}
