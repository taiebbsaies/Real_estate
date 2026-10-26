#!/usr/bin/env node
/**
 * Remove the development-only test apartments and occupancies created by
 * scripts/seed-test-properties.mjs.
 *
 * Usage (from the repository root):
 *   node scripts/cleanup-test-properties.mjs
 *
 * Safety rules:
 * - refuses to run in production;
 * - requires ENABLE_TEST_PROPERTIES=true;
 * - only accepts a loopback MongoDB URI;
 * - only accepts the confirmed local database name (`homecheck`);
 * - refuses to delete anything while a complaint still references a test
 *   apartment, so complaint data is never orphaned or removed implicitly;
 * - only deletes documents flagged with `isTestData: true`;
 * - never touches users, profiles, reviews, favorites, or complaints.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import mongoose from "mongoose";

const ALLOWED_DATABASE = "homecheck";
const TEST_PROPERTY_CODES = ["TEST-101", "TEST-202", "TEST-303"];

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
    throw new Error("Refusing to clean up test apartments in production.");
  }
  if (process.env.ENABLE_TEST_PROPERTIES !== "true") {
    throw new Error(
      "Refusing to clean up: set ENABLE_TEST_PROPERTIES=true in .env.local first.",
    );
  }
  if (!uri) {
    throw new Error("Refusing to clean up: MONGODB_URI is not defined.");
  }

  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error("Refusing to clean up: MONGODB_URI is not a valid URL.");
  }

  if (parsed.protocol !== "mongodb:") {
    throw new Error(
      `Refusing to clean up: only mongodb:// loopback URIs are allowed (got ${parsed.protocol}).`,
    );
  }

  const host = parsed.hostname.toLowerCase();
  const isLoopback =
    host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (!isLoopback) {
    throw new Error(
      `Refusing to clean up: MONGODB_URI host "${host}" is not a loopback address.`,
    );
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  if (databaseName !== ALLOWED_DATABASE) {
    throw new Error(
      `Refusing to clean up: database "${databaseName}" is not the confirmed local development database "${ALLOWED_DATABASE}".`,
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

  const properties = db.collection("testproperties");
  const occupancies = db.collection("testoccupancies");

  const testProperties = await properties
    .find({ code: { $in: TEST_PROPERTY_CODES }, isTestData: true })
    .project({ _id: 1, code: 1 })
    .toArray();

  if (testProperties.length === 0) {
    console.log("No test apartments found. Nothing to delete.");
  } else {
    const propertyIds = testProperties.map((property) => property._id);

    const referencingComplaints = await db
      .collection("complaints")
      .countDocuments({ propertyId: { $in: propertyIds } });

    if (referencingComplaints > 0) {
      throw new Error(
        `Refusing to clean up: ${referencingComplaints} complaint(s) still reference the test apartments. Delete those complaints explicitly first; this script never removes complaint data.`,
      );
    }

    const occupancyResult = await occupancies.deleteMany({
      propertyId: { $in: propertyIds },
      isTestData: true,
    });
    const propertyResult = await properties.deleteMany({
      _id: { $in: propertyIds },
      isTestData: true,
    });

    console.log(
      `Removed ${occupancyResult.deletedCount} test occupancy/occupancies and ${propertyResult.deletedCount} test apartment(s) (${testProperties
        .map((property) => property.code)
        .join(", ")}).`,
    );
  }

  console.log(
    "No users, profiles, favorites, or complaints were modified.",
  );
} finally {
  await mongoose.disconnect();
}
