import "server-only";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import {
  getOccupiedTestProperties,
  getOwnedTestPropertyIds,
  getTestPropertyMap,
  getTestPropertyOwnerId,
  tenantOccupiesTestProperty,
} from "@/lib/test-properties/queries";
import { PropertyModel } from "@/src/models/shared";
import type { ComplaintProperty } from "./types";

/**
 * Logements a complaint can target. A tenant is linked to a real listing by
 * `properties.tenantId`, set when the owner assigns the tenant. Development
 * test apartments stay available when they are enabled.
 */

type PropertyDoc = {
  _id: unknown;
  title: string;
  address: string;
  city: string;
};

function serialize(doc: PropertyDoc): ComplaintProperty {
  return {
    _id: String(doc._id),
    label: doc.title,
    address: doc.address,
    city: doc.city,
  };
}

// `deletedAt` belongs to the listing schema, not to this maintenance view of
// the same collection, so the filter must not be stripped by strictQuery.
const NOT_DELETED_OPTIONS = { strictQuery: false } as const;

export async function getTenantComplaintProperties(
  tenantId: string,
): Promise<ComplaintProperty[]> {
  if (!isValidObjectId(tenantId)) return [];

  await connectDB();

  const [docs, testProperties] = await Promise.all([
    PropertyModel.find({ tenantId, deletedAt: null })
      .setOptions(NOT_DELETED_OPTIONS)
      .select("title address city")
      .sort({ title: 1 })
      .lean<PropertyDoc[]>(),
    getOccupiedTestProperties(tenantId),
  ]);

  return [...docs.map(serialize), ...testProperties];
}

export async function tenantCanComplainAbout(
  tenantId: string,
  propertyId: string,
): Promise<boolean> {
  if (!isValidObjectId(tenantId) || !isValidObjectId(propertyId)) return false;

  await connectDB();

  const assigned = await PropertyModel.findOne({
    _id: propertyId,
    tenantId,
    deletedAt: null,
  })
    .setOptions(NOT_DELETED_OPTIONS)
    .select("_id")
    .lean();

  return (
    Boolean(assigned) || tenantOccupiesTestProperty(tenantId, propertyId)
  );
}

/** Deleted listings stay resolved so existing complaints keep their context. */
export async function getComplaintPropertyMap(
  propertyIds: string[],
): Promise<Map<string, ComplaintProperty>> {
  const validIds = [
    ...new Set(propertyIds.filter((id) => isValidObjectId(id))),
  ];
  const map = new Map<string, ComplaintProperty>();
  if (validIds.length === 0) return map;

  await connectDB();

  const [docs, testProperties] = await Promise.all([
    PropertyModel.find({ _id: { $in: validIds } })
      .select("title address city")
      .lean<PropertyDoc[]>(),
    getTestPropertyMap(validIds),
  ]);

  for (const doc of docs) {
    map.set(String(doc._id), serialize(doc));
  }
  for (const [id, property] of testProperties) {
    map.set(id, property);
  }

  return map;
}

export async function getOwnedComplaintPropertyIds(
  ownerId: string,
): Promise<string[]> {
  if (!isValidObjectId(ownerId)) return [];

  await connectDB();

  const [docs, testIds] = await Promise.all([
    PropertyModel.find({ ownerId }).select("_id").lean(),
    getOwnedTestPropertyIds(ownerId),
  ]);

  return [...docs.map((doc) => String(doc._id)), ...testIds];
}

export async function getComplaintPropertyOwnerId(
  propertyId: string,
): Promise<string | null> {
  if (!isValidObjectId(propertyId)) return null;

  await connectDB();

  const doc = await PropertyModel.findById(propertyId).select("ownerId").lean();
  if (doc?.ownerId) return String(doc.ownerId);

  return getTestPropertyOwnerId(propertyId);
}
