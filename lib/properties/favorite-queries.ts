import "server-only";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import Favorite from "@/models/favorite";
import Property from "@/models/property";
import type { PublicProperty } from "@/lib/properties/types";
import { serializePublicProperty } from "@/lib/properties/public-queries";

export async function getMyFavoriteIds(): Promise<string[]> {
  const session = await getSession();
  if (!session || session.activeRole !== "TENANT") {
    return [];
  }

  await connectDB();

  const favorites = await Favorite.find({ userId: session.userId })
    .sort({ createdAt: -1 })
    .select("propertyId")
    .lean();
  const propertyIds = favorites.map((favorite) => favorite.propertyId);
  if (propertyIds.length === 0) {
    return [];
  }

  const properties = await Property.find({
    _id: { $in: propertyIds },
    moderationStatus: "approved",
    deletedAt: null,
  })
    .select("_id")
    .lean();
  const publicPropertyIds = new Set(
    properties.map((property) => String(property._id)),
  );

  return propertyIds
    .map(String)
    .filter((propertyId) => publicPropertyIds.has(propertyId));
}

export async function getMyFavorites(): Promise<PublicProperty[]> {
  const session = await getSession();
  if (!session || session.activeRole !== "TENANT") {
    return [];
  }

  await connectDB();

  const favorites = await Favorite.find({ userId: session.userId })
    .sort({ createdAt: -1 })
    .select("propertyId")
    .lean();
  const propertyIds = favorites.map((favorite) => favorite.propertyId);
  if (propertyIds.length === 0) {
    return [];
  }

  const properties = await Property.find({
    _id: { $in: propertyIds },
    moderationStatus: "approved",
    deletedAt: null,
  }).lean();
  const propertiesById = new Map(
    properties.map((property) => [
      String(property._id),
      serializePublicProperty(property),
    ]),
  );

  return propertyIds
    .map((propertyId) => propertiesById.get(String(propertyId)))
    .filter((property): property is PublicProperty => property !== undefined);
}
