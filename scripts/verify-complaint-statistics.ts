#!/usr/bin/env node
/**
 * Focused verification for the complaints statistics feature.
 *
 * Usage (from the repository root):
 *   npx --yes tsx scripts/verify-complaint-statistics.ts
 *
 * Safety rules:
 * - refuses production;
 * - requires a loopback MongoDB URI;
 * - requires a dedicated database name containing "_test" or "_verify";
 * - drops only that dedicated database before and after the run.
 *
 * It checks the pure reporting helpers and runs the real aggregation pipeline
 * against a temporary MongoDB database with a fixed reference date.
 */
import assert from "node:assert/strict";
import mongoose from "mongoose";
import type { ComplaintCategory } from "../lib/constants/complaint";
import {
  buildOwnerComplaintsHref,
  composeCategoryStats,
  composeMonthlyStats,
  composeStatusCounts,
  formatResolutionDuration,
  getStatisticsPeriodRange,
  parseStatisticsPeriod,
} from "../lib/complaints/statistics";
import { buildComplaintStatisticsPipeline } from "../lib/complaints/statistics-pipeline";
import { getResolutionTimestampUpdate } from "../lib/complaints/resolution";

const DEFAULT_URI = "mongodb://127.0.0.1:27017/homecheck_stats_verify";
const uri = process.env.MONGODB_URI ?? DEFAULT_URI;

function assertSafeDatabase(target: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run verification in production.");
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    throw new Error("MONGODB_URI is not a valid URL.");
  }

  if (parsed.protocol !== "mongodb:") {
    throw new Error("Only mongodb:// loopback URIs are allowed.");
  }

  const host = parsed.hostname.toLowerCase();
  if (!["127.0.0.1", "localhost", "::1"].includes(host)) {
    throw new Error(`Refusing non-loopback host: ${host}`);
  }

  const database = parsed.pathname.replace(/^\//, "");
  if (!/(_test|_verify)$/.test(database)) {
    throw new Error(
      `Refusing database "${database}": name must end with _test or _verify.`,
    );
  }
}

function testPureHelpers() {
  assert.equal(parseStatisticsPeriod(undefined), 6);
  assert.equal(parseStatisticsPeriod("6"), 6);
  assert.equal(parseStatisticsPeriod("12"), 12);
  assert.equal(parseStatisticsPeriod("99"), 6);
  assert.equal(parseStatisticsPeriod(["12"]), 12);

  const range = getStatisticsPeriodRange(
    6,
    new Date("2026-01-15T12:00:00.000Z"),
  );
  assert.equal(range.start.toISOString(), "2025-08-01T00:00:00.000Z");
  assert.deepEqual(
    range.months.map((month) => month.key),
    [
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
    ],
  );
  assert.deepEqual(
    range.months.map((month) => month.label),
    ["août 2025", "sept. 2025", "oct. 2025", "nov. 2025", "déc. 2025", "janv. 2026"],
  );

  assert.deepEqual(
    composeCategoryStats([
      { _id: "noise", count: 3 },
      { _id: "plumbing", count: 3 },
    ]).map((row) => [row.category, row.count]),
    [
      ["plumbing", 3],
      ["noise", 3],
      ["electricity", 0],
      ["heating", 0],
      ["structural", 0],
      ["common_areas", 0],
      ["other", 0],
    ],
  );

  assert.deepEqual(
    composeMonthlyStats(range.months, [
      { _id: "2025-12", count: 4 },
      { _id: "2026-01", count: 1 },
    ]).map((month) => month.count),
    [0, 0, 0, 0, 4, 1],
  );

  const counts = composeStatusCounts(
    { pending: 2, in_progress: 1, resolved: 4, rejected: 1 },
    3,
  );
  assert.equal(counts.total, 8);
  assert.equal(
    counts.total,
    counts.pending + counts.in_progress + counts.resolved + counts.rejected,
  );
  assert.equal(counts.urgent, 3);

  assert.equal(formatResolutionDuration(30_000), "< 1 min");
  assert.equal(formatResolutionDuration(90 * 60_000), "1 h 30 min");
  assert.equal(formatResolutionDuration(2.5 * 86_400_000), "2 j 12 h");
  assert.equal(formatResolutionDuration(52 * 3_600_000), "2 j 4 h");
  assert.equal(formatResolutionDuration(null), null);
  assert.equal(formatResolutionDuration(Number.NaN), null);

  assert.equal(buildOwnerComplaintsHref(), "/dashboard/owner/complaints");
  assert.equal(
    buildOwnerComplaintsHref({ status: "resolved" }),
    "/dashboard/owner/complaints?status=resolved",
  );
  assert.equal(
    buildOwnerComplaintsHref({ period: 12 }),
    "/dashboard/owner/complaints?period=12",
  );
  assert.equal(
    buildOwnerComplaintsHref({ status: "pending", period: 12 }),
    "/dashboard/owner/complaints?status=pending&period=12",
  );

  const fixedNow = new Date("2026-10-26T12:00:00.000Z");
  assert.deepEqual(getResolutionTimestampUpdate("in_progress", "resolved", fixedNow), {
    setResolvedAt: fixedNow,
  });
  assert.deepEqual(getResolutionTimestampUpdate("resolved", "resolved", fixedNow), {});
  assert.deepEqual(getResolutionTimestampUpdate("resolved", "in_progress", fixedNow), {
    clearResolvedAt: true,
  });
  assert.deepEqual(getResolutionTimestampUpdate("pending", "in_progress", fixedNow), {
    clearResolvedAt: true,
  });
}

const base = new Date("2026-01-01T00:00:00.000Z");

function at(monthOffset: number, days: number, hours = 0): Date {
  return new Date(
    Date.UTC(
      2026,
      monthOffset,
      days,
      hours,
    ),
  );
}

function buildDocuments(ownerPropertyId: mongoose.Types.ObjectId, otherPropertyId: mongoose.Types.ObjectId) {
  const tenantId = new mongoose.Types.ObjectId();
  const technicianId = new mongoose.Types.ObjectId();

  const complaint = (
    overrides: Record<string, unknown>,
  ): Record<string, unknown> => ({
    tenantId,
    title: "Réclamation de vérification",
    description: "Donnée de test isolée",
    category: "other",
    priority: "medium",
    status: "pending",
    technicianId,
    createdAt: base,
    updatedAt: base,
    ...overrides,
  });

  return {
    tenantId,
    documents: [
      // 11 complaints: 10 visible to the owner, 1 attached to another owner.
      complaint({
        category: "plumbing",
        priority: "urgent",
        status: "pending",
        propertyId: ownerPropertyId,
        createdAt: at(9, 2),
      }),
      complaint({
        category: "electricity",
        priority: "high",
        status: "in_progress",
        createdAt: at(9, 5),
      }),
      complaint({
        category: "plumbing",
        status: "resolved",
        propertyId: ownerPropertyId,
        createdAt: at(9, 1),
        resolvedAt: at(9, 3, 12),
      }),
      complaint({
        category: "heating",
        priority: "urgent",
        status: "resolved",
        createdAt: at(8, 2),
        resolvedAt: at(8, 4),
      }),
      complaint({
        category: "heating",
        status: "resolved",
        propertyId: ownerPropertyId,
        createdAt: at(8, 10),
        // Missing resolvedAt: counts as resolved but not in the average.
      }),
      complaint({
        category: "structural",
        priority: "low",
        status: "rejected",
        propertyId: ownerPropertyId,
        createdAt: at(7, 1),
      }),
      complaint({
        category: "noise",
        status: "pending",
        createdAt: at(6, 15),
      }),
      complaint({
        category: "common_areas",
        priority: "urgent",
        status: "in_progress",
        propertyId: ownerPropertyId,
        createdAt: at(5, 1),
      }),
      complaint({
        category: "other",
        priority: "high",
        status: "resolved",
        createdAt: new Date("2025-12-10T00:00:00.000Z"),
        resolvedAt: new Date("2025-12-12T00:00:00.000Z"),
      }),
      complaint({
        category: "electricity",
        priority: "low",
        status: "resolved",
        propertyId: ownerPropertyId,
        createdAt: at(8, 20),
        // Invalid: resolved before creation, must be excluded from the average.
        resolvedAt: at(8, 1),
      }),
      complaint({
        category: "other",
        status: "pending",
        propertyId: otherPropertyId,
        createdAt: at(9, 8),
      }),
    ],
  };
}

async function testAggregation() {
  await mongoose.connect(uri, { bufferCommands: false });
  const db = mongoose.connection.db;
  assert.ok(db);
  await db.dropDatabase();

  const ownerPropertyId = new mongoose.Types.ObjectId();
  const otherPropertyId = new mongoose.Types.ObjectId();
  const { documents } = buildDocuments(ownerPropertyId, otherPropertyId);

  const collection = db.collection("complaints");
  await collection.insertMany(documents);

  const now = new Date("2026-10-26T12:00:00.000Z");
  const ownerScope = {
    $or: [
      { propertyId: { $exists: false } },
      { propertyId: null },
      { propertyId: { $in: [ownerPropertyId] } },
    ],
  };

  async function run(period: 6 | 12, scope: Record<string, unknown>) {
    const range = getStatisticsPeriodRange(period, now);
    const rows = await collection
      .aggregate<{
        allTime: Array<{
          pending: number;
          in_progress: number;
          resolved: number;
          rejected: number;
          urgent: number;
        }>;
        periodStatuses: Array<{ _id: string; count: number }>;
        categories: Array<{ _id: ComplaintCategory; count: number }>;
        monthly: Array<{ _id: string; count: number }>;
        resolution: Array<{ averageMs: number | null; sampleSize: number }>;
      }>(buildComplaintStatisticsPipeline(scope, range))
      .toArray();

    const result = rows[0];
    const allTimeRow = result?.allTime[0];
    const allTime = composeStatusCounts(
      {
        pending: allTimeRow?.pending ?? 0,
        in_progress: allTimeRow?.in_progress ?? 0,
        resolved: allTimeRow?.resolved ?? 0,
        rejected: allTimeRow?.rejected ?? 0,
      },
      allTimeRow?.urgent ?? 0,
    );
    const periodTotal = (result?.periodStatuses ?? []).reduce(
      (sum, row) => sum + row.count,
      0,
    );
    const resolutionRow = result?.resolution[0];

    return {
      allTime,
      periodTotal,
      categories: composeCategoryStats(result?.categories ?? []),
      monthly: composeMonthlyStats(range.months, result?.monthly ?? []),
      resolution: {
        averageMs: resolutionRow?.averageMs ?? null,
        sampleSize: resolutionRow?.sampleSize ?? 0,
      },
    };
  }

  try {
    const six = await run(6, ownerScope);
    assert.deepEqual(six.allTime, {
      pending: 2,
      in_progress: 2,
      resolved: 5,
      rejected: 1,
      total: 10,
      urgent: 3,
    });
    assert.equal(six.periodTotal, 9);
    assert.deepEqual(
      six.categories.map((row) => [row.category, row.count]),
      [
        ["plumbing", 2],
        ["electricity", 2],
        ["heating", 2],
        ["structural", 1],
        ["noise", 1],
        ["common_areas", 1],
        ["other", 0],
      ],
    );
    assert.deepEqual(
      six.monthly.map((month) => [month.key, month.count]),
      [
        ["2026-05", 0],
        ["2026-06", 1],
        ["2026-07", 1],
        ["2026-08", 1],
        ["2026-09", 3],
        ["2026-10", 3],
      ],
    );
    assert.equal(six.resolution.sampleSize, 2);
    assert.equal(formatResolutionDuration(six.resolution.averageMs), "2 j 6 h");

    const twelve = await run(12, ownerScope);
    assert.equal(twelve.allTime.total, 10);
    assert.equal(twelve.periodTotal, 10);
    assert.deepEqual(
      twelve.categories.map((row) => [row.category, row.count]),
      [
        ["plumbing", 2],
        ["electricity", 2],
        ["heating", 2],
        ["structural", 1],
        ["noise", 1],
        ["common_areas", 1],
        ["other", 1],
      ],
    );
    assert.deepEqual(
      twelve.monthly.map((month) => [month.key, month.count]),
      [
        ["2025-11", 0],
        ["2025-12", 1],
        ["2026-01", 0],
        ["2026-02", 0],
        ["2026-03", 0],
        ["2026-04", 0],
        ["2026-05", 0],
        ["2026-06", 1],
        ["2026-07", 1],
        ["2026-08", 1],
        ["2026-09", 3],
        ["2026-10", 3],
      ],
    );
    assert.equal(twelve.resolution.sampleSize, 3);
    assert.equal(formatResolutionDuration(twelve.resolution.averageMs), "2 j 4 h");

    // Admins see the complaint attached to another owner's apartment.
    const admin = await run(6, {});
    assert.equal(admin.allTime.total, 11);
    assert.equal(admin.allTime.pending, 3);
    assert.equal(admin.periodTotal, 10);

    // Empty database: every group must degrade to zeros/null.
    await collection.deleteMany({});
    const empty = await run(6, ownerScope);
    assert.equal(empty.allTime.total, 0);
    assert.equal(empty.periodTotal, 0);
    assert.ok(empty.categories.every((row) => row.count === 0));
    assert.ok(empty.monthly.every((month) => month.count === 0));
    assert.equal(empty.resolution.averageMs, null);
    assert.equal(empty.resolution.sampleSize, 0);

    console.log("✔ Pure statistics helpers");
    console.log("✔ Aggregation: mixed statuses/categories");
    console.log("✔ Aggregation: zero-count months and year boundary");
    console.log("✔ Aggregation: resolution average and invalid timestamps");
    console.log("✔ Aggregation: owner scope vs admin scope");
    console.log("✔ Aggregation: empty database");
  } finally {
    await db.dropDatabase();
    await mongoose.disconnect();
  }
}

async function main() {
  assertSafeDatabase(uri);
  testPureHelpers();
  await testAggregation();
  console.log("All complaint statistics verification checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
