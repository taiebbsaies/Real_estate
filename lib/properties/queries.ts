import "server-only";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import Property, { type IProperty } from "@/models/property";
import type { SerializedProperty } from "@/lib/properties/types";

// The maintenance module stores its records in the same collection. Only real
// listings carry a moderation status.
const IS_LISTING = { moderationStatus: { $exists: true } };

function serializeProperty(
  doc: IProperty & { _id: unknown },
): SerializedProperty {
  return {
    _id: String(doc._id),
    ownerId: doc.ownerId.toString(),
    title: doc.title,
    description: doc.description,
    price: doc.price,
    city: doc.city,
    zone: doc.zone,
    address: doc.address,
    latitude: doc.latitude,
    longitude: doc.longitude,
    surface: doc.surface,
    bedrooms: doc.bedrooms,
    bathrooms: doc.bathrooms,
    type: doc.type,
    condition: doc.condition,
    availability: doc.availability,
    availableFrom: doc.availableFrom?.toISOString(),
    hasParking: doc.hasParking,
    hasElevator: doc.hasElevator,
    // .lean() skips schema defaults, so older documents may lack these arrays.
    equipments: doc.equipments ?? [],
    images: doc.images ?? [],
    coverImage: doc.coverImage,
    rules: doc.rules,
    moderationStatus: doc.moderationStatus,
    moderationReason: doc.moderationReason,
    deletedAt: doc.deletedAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/**
 * Fetch the authenticated owner's own property listings.
 * Soft-deleted listings are excluded; newest first.
 */
export async function getMyProperties(): Promise<SerializedProperty[]> {
  const session = await getSession();
  if (!session || session.activeRole !== "OWNER") {
    return [];
  }

  await connectDB();

  const docs = await Property.find({
    ...IS_LISTING,
    ownerId: session.userId,
    deletedAt: null,
  }).sort({ createdAt: -1 }).lean();

  return docs.map(serializeProperty);
}

/**
 * Fetch one of the authenticated owner's own listings by id.
 * Returns null when the listing is unknown, soft-deleted, or not owned.
 */
export async function getMyPropertyById(
  id: string,
): Promise<SerializedProperty | null> {
  const session = await getSession();
  if (!session || session.activeRole !== "OWNER") {
    return null;
  }

  if (!isValidObjectId(id)) {
    return null;
  }

  await connectDB();

  const doc = await Property.findOne({
    ...IS_LISTING,
    _id: id,
    ownerId: session.userId,
    deletedAt: null,
  }).lean();

  return doc ? serializeProperty(doc) : null;
}
