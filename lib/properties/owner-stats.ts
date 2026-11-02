import "server-only";
import { isValidObjectId, Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import Favorite from "@/models/favorite";
import Property from "@/models/property";
import PropertyView from "@/models/PropertyView";

export type OwnerPropertyStats = {
  views: number;
  favorites: number;
};

type PropertyCount = {
  _id: Types.ObjectId;
  count: number;
};

export async function getOwnerPropertyStats(
  ownerId: string,
  propertyIds: string[],
): Promise<Record<string, OwnerPropertyStats>> {
  const session = await getSession();
  if (
    !session ||
    session.activeRole !== "OWNER" ||
    session.userId !== ownerId
  ) {
    return {};
  }

  const requestedIds = [...new Set(propertyIds.filter(isValidObjectId))];
  if (requestedIds.length === 0) {
    return {};
  }

  await connectDB();

  const ownedProperties = await Property.find({
    _id: { $in: requestedIds },
    ownerId: session.userId,
    deletedAt: null,
  })
    .select("_id")
    .lean();
  const ownedIds = ownedProperties.map((property) => property._id);

  if (ownedIds.length === 0) {
    return {};
  }

  const [viewCounts, favoriteCounts] = await Promise.all([
    PropertyView.aggregate<PropertyCount>([
      { $match: { propertyId: { $in: ownedIds } } },
      { $group: { _id: "$propertyId", count: { $sum: 1 } } },
    ]),
    Favorite.aggregate<PropertyCount>([
      { $match: { propertyId: { $in: ownedIds } } },
      { $group: { _id: "$propertyId", count: { $sum: 1 } } },
    ]),
  ]);

  const stats: Record<string, OwnerPropertyStats> = Object.fromEntries(
    ownedIds.map((id) => [String(id), { views: 0, favorites: 0 }]),
  );

  for (const result of viewCounts) {
    const propertyStats = stats[String(result._id)];
    if (propertyStats) {
      propertyStats.views = result.count;
    }
  }

  for (const result of favoriteCounts) {
    const propertyStats = stats[String(result._id)];
    if (propertyStats) {
      propertyStats.favorites = result.count;
    }
  }

  return stats;
}
