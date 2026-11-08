// Copies the local maintenance photos to Vercel Blob. Keys do not change, so database records stay valid.
// Safe to run several times, and local files are not deleted.
// Usage: node --env-file=.env scripts/migrate-photos-to-blob.mjs
// With a store connected through OIDC, first run: vercel env pull .env.local
// then add --env-file=.env.local to the command.
import fs from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

const storeId = process.env.BLOB_READ_WRITE_TOKEN_STORE_ID || undefined;

if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.VERCEL_OIDC_TOKEN && storeId)) {
  console.error("No Blob credentials found. Set BLOB_READ_WRITE_TOKEN, or pull VERCEL_OIDC_TOKEN and the store ID with vercel env pull.");
  process.exit(1);
}

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

const directory = path.resolve(process.env.STORAGE_DIR || "uploads/maintenance");
const names = await fs.readdir(directory);
let failed = 0;

for (const name of names) {
  const contentType = MIME_TYPES[path.extname(name).toLowerCase()];
  if (!contentType) continue;

  try {
    await put(`maintenance/${name}`, await fs.readFile(path.join(directory, name)), {
      access: "private",
      storeId,
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    console.log(`Uploaded ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`Failed ${name}: ${error.message}`);
  }
}

console.log(`Done. Files found: ${names.length}. Failed: ${failed}.`);
if (failed > 0) process.exitCode = 1;
