#!/usr/bin/env node
/**
 * Seed development-only test apartments and occupancies.
 *
 * Usage (from the repository root):
 *   node scripts/seed-test-properties.mjs
 *
 * Safety rules:
 * - refuses to run in production;
 * - requires ENABLE_TEST_PROPERTIES=true;
 * - only accepts a loopback MongoDB URI;
 * - only accepts the confirmed local database name (`homecheck`);
 * - only creates/updates documents flagged with `isTestData: true`;
 * - never creates users, profiles, favorites, or complaints.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import mongoose from "mongoose";

const ALLOWED_DATABASE = "homecheck";
const OWNER_EMAIL = "sami.owner.test@example.com";
const TENANT_EMAIL = "storehuni@gmail.com";

const TEST_PROPERTIES = [
  {
    code: "TEST-101",
    label: "Studio fictif — 1 pièce",
    address: "1 rue des Tests (adresse fictive)",
    city: "Paris",
  },
  {
    code: "TEST-202",
    label: "Appartement fictif — 2 pièces",
    address: "2 avenue des Tests (adresse fictive)",
    city: "Lyon",
  },
  {
    code: "TEST-303",
    label: "Appartement fictif — 3 pièces",
    address: "3 boulevard des Tests (adresse fictive)",
    city: "Marseille",
  },
];

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function assertSafeTarget(uri) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed test apartments in production.");
  }
  if (process.env.ENABLE_TEST_PROPERTIES !== "true") {
    throw new Error(
      "Refusing to seed: set ENABLE_TEST_PROPERTIES=true in .env.local first.",
    );
  }
  if (!uri) {
    throw new Error("Refusing to seed: MONGODB_URI is not defined.");
  }

  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error("Refusing to seed: MONGODB_URI is not a valid URL.");
  }

  if (parsed.protocol !== "mongodb:") {
    throw new Error(
      `Refusing to seed: only mongodb:// loopback URIs are allowed (got ${parsed.protocol}).`,
    );
  }

  const host = parsed.hostname.toLowerCase();
  const isLoopback =
    host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (!isLoopback) {
    throw new Error(
      `Refusing to seed: MONGODB_URI host "${host}" is not a loopback address.`,
    );
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (databaseName !== ALLOWED_DATABASE) {
    throw new Error(
      `Refusing to seed: database "${databaseName}" is not the confirmed local development database "${ALLOWED_DATABASE}".`,
    );
  }

  return parsed.href.replace(/\/\/[^@/]+@/, "//***@");
}

loadEnvLocal();
const uri = process.env.MONGODB_URI;
const safeUri = assertSafeTarget(uri);

await mongoose.connect(uri, { bufferCommands: false });

try {
  const db = mongoose.connection.db;
  console.log(`Target database: ${db.databaseName} (${safeUri})`);

  const users = db.collection("users");
  const owner = await users.findOne(
    { email: OWNER_EMAIL },
    { projection: { _id: 1, email: 1 } },
  );
  const tenant = await users.findOne(
    { email: TENANT_EMAIL },
    { projection: { _id: 1, email: 1 } },
  );

  if (!owner) {
    throw new Error(
      `Owner account "${OWNER_EMAIL}" was not found. Create it first; this script never creates users.`,
    );
  }
  if (!tenant) {
    throw new Error(
      `Tenant account "${TENANT_EMAIL}" was not found. Create it first; this script never creates users.`,
    );
  }

  const properties = db.collection("testproperties");
  const occupancies = db.collection("testoccupancies");
  const now = new Date();
  const summary = [];

  for (const definition of TEST_PROPERTIES) {
    const existing = await properties.findOne({ code: definition.code });

    if (existing && existing.isTestData !== true) {
      throw new Error(
        `Refusing to overwrite non-test document with code "${definition.code}".`,
      );
    }

    let propertyId;
    if (existing) {
      await properties.updateOne(
        { _id: existing._id, isTestData: true },
        {
          $set: {
            label: definition.label,
            address: definition.address,
            city: definition.city,
            ownerId: owner._id,
            updatedAt: now,
          },
        },
      );
      propertyId = existing._id;
    } else {
      const inserted = await properties.insertOne({
        code: definition.code,
        label: definition.label,
        address: definition.address,
        city: definition.city,
        ownerId: owner._id,
        isTestData: true,
        createdAt: now,
        updatedAt: now,
      });
      propertyId = inserted.insertedId;
    }

    const existingOccupancy = await occupancies.findOne({
      propertyId,
      tenantId: tenant._id,
    });

    if (existingOccupancy && existingOccupancy.isTestData !== true) {
      throw new Error(
        `Refusing to overwrite non-test occupancy for "${definition.code}".`,
      );
    }

    if (existingOccupancy) {
      await occupancies.updateOne(
        { _id: existingOccupancy._id, isTestData: true },
        {
          $set: { isActive: true, updatedAt: now },
          $unset: { endsAt: "" },
        },
      );
    } else {
      await occupancies.insertOne({
        propertyId,
        tenantId: tenant._id,
        isActive: true,
        startsAt: now,
        isTestData: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    summary.push({
      code: definition.code,
      propertyId: String(propertyId),
      owner: OWNER_EMAIL,
      tenant: TENANT_EMAIL,
      active: true,
    });
  }

  console.log("Test apartments ready:");
  console.table(summary);
  console.log(
    "Only testproperties/testoccupancies documents were created or updated.",
  );
} finally {
  await mongoose.disconnect();
}
