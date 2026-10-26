import "server-only";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import TestOccupancy from "@/models/testOccupancy";
import TestProperty, { type ITestProperty } from "@/models/testProperty";
import { isTestPropertiesEnabled } from "./config";
import type { SerializedTestProperty } from "./types";

function serialize(
  doc: ITestProperty & { _id: unknown },
): SerializedTestProperty {
  return {
    _id: String(doc._id),
    code: doc.code,
    label: doc.label,
    address: doc.address,
    city: doc.city,
  };
}

/**
 * Test apartments actively occupied by the given tenant.
 * Returns an empty list whenever the test feature is disabled.
 */
export async function getOccupiedTestProperties(
  tenantId: string,
): Promise<SerializedTestProperty[]> {
  if (!isTestPropertiesEnabled() || !isValidObjectId(tenantId)) return [];

  await connectDB();

  const occupancies = await TestOccupancy.find({
    tenantId,
    isActive: true,
    isTestData: true,
  })
    .select("propertyId")
    .lean();

  if (occupancies.length === 0) return [];

  const propertyIds = occupancies.map((occupancy) => occupancy.propertyId);
  const docs = await TestProperty.find({
    _id: { $in: propertyIds },
    isTestData: true,
  })
    .sort({ code: 1 })
    .lean();

  return docs.map(serialize);
}

/**
 * Resolve the property metadata for a batch of complaint property ids.
 * Used when serializing complaints so cards can show the apartment code/address.
 */
export async function getTestPropertyMap(
  propertyIds: string[],
): Promise<Map<string, SerializedTestProperty>> {
  const map = new Map<string, SerializedTestProperty>();
  if (!isTestPropertiesEnabled() || propertyIds.length === 0) return map;

  const validIds = [
    ...new Set(propertyIds.filter((id) => isValidObjectId(id))),
  ];
  if (validIds.length === 0) return map;

  await connectDB();

  const docs = await TestProperty.find({
    _id: { $in: validIds },
    isTestData: true,
  }).lean();

  for (const doc of docs) {
    map.set(String(doc._id), serialize(doc));
  }

  return map;
}

/**
 * Ids of the test apartments owned by the given owner.
 * Returns an empty list whenever the test feature is disabled.
 */
export async function getOwnedTestPropertyIds(
  ownerId: string,
): Promise<string[]> {
  if (!isTestPropertiesEnabled() || !isValidObjectId(ownerId)) return [];

  await connectDB();

  const docs = await TestProperty.find({
    ownerId,
    isTestData: true,
  })
    .select("_id")
    .lean();

  return docs.map((doc) => String(doc._id));
}

/**
 * Server-side occupancy proof: the tenant must have an active test occupancy
 * on a real (test-flagged) test apartment.
 */
export async function tenantOccupiesTestProperty(
  tenantId: string,
  propertyId: string,
): Promise<boolean> {
  if (
    !isTestPropertiesEnabled() ||
    !isValidObjectId(tenantId) ||
    !isValidObjectId(propertyId)
  ) {
    return false;
  }

  await connectDB();

  const property = await TestProperty.exists({
    _id: propertyId,
    isTestData: true,
  });
  if (!property) return false;

  const occupancy = await TestOccupancy.exists({
    propertyId,
    tenantId,
    isActive: true,
    isTestData: true,
  });

  return Boolean(occupancy);
}

/**
 * Server-side ownership proof for staff status updates.
 * Returns null when the property does not exist or the feature is disabled.
 */
export async function getTestPropertyOwnerId(
  propertyId: string,
): Promise<string | null> {
  if (!isTestPropertiesEnabled() || !isValidObjectId(propertyId)) return null;

  await connectDB();

  const doc = await TestProperty.findOne({
    _id: propertyId,
    isTestData: true,
  })
    .select("ownerId")
    .lean();

  return doc?.ownerId ? String(doc.ownerId) : null;
}
