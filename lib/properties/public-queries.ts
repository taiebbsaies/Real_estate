import "server-only";
import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Property, { type IProperty } from "@/models/property";
import type { PublicProperty } from "@/lib/properties/types";
import {
  parsePropertySearchParams,
  type PropertySearchFilters,
} from "@/lib/validations/property-search";

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function serializePublicProperty(
  doc: IProperty & { _id: unknown },
): PublicProperty {
  return {
    _id: String(doc._id),
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
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function buildSearchFilter(
  filters: PropertySearchFilters,
) {
  return {
    moderationStatus: "approved" as const,
    deletedAt: null,
    availability: "available" as const,
    ...(filters.city
      ? { city: { $regex: escapeRegex(filters.city), $options: "i" } }
      : {}),
    ...(filters.zone
      ? { zone: { $regex: escapeRegex(filters.zone), $options: "i" } }
      : {}),
    ...(filters.priceMin !== undefined || filters.priceMax !== undefined
      ? {
          price: {
            ...(filters.priceMin !== undefined
              ? { $gte: filters.priceMin }
              : {}),
            ...(filters.priceMax !== undefined
              ? { $lte: filters.priceMax }
              : {}),
          },
        }
      : {}),
    ...(filters.surfaceMin !== undefined || filters.surfaceMax !== undefined
      ? {
          surface: {
            ...(filters.surfaceMin !== undefined
              ? { $gte: filters.surfaceMin }
              : {}),
            ...(filters.surfaceMax !== undefined
              ? { $lte: filters.surfaceMax }
              : {}),
          },
        }
      : {}),
    ...(filters.bedrooms !== undefined
      ? { bedrooms: { $gte: filters.bedrooms } }
      : {}),
    ...(filters.bathrooms !== undefined
      ? { bathrooms: { $gte: filters.bathrooms } }
      : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.equipments.length > 0
      ? { equipments: { $all: filters.equipments } }
      : {}),
  };
}

export async function searchProperties(rawSearchParams: unknown): Promise<{
  items: PublicProperty[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const filters = parsePropertySearchParams(rawSearchParams);
  const filter = buildSearchFilter(filters);
  const sort: Record<string, 1 | -1> =
    filters.sort === "price_asc"
      ? { price: 1 as const, createdAt: -1 as const }
      : filters.sort === "price_desc"
        ? { price: -1 as const, createdAt: -1 as const }
        : { createdAt: -1 as const };

  await connectDB();

  const [docs, total] = await Promise.all([
    Property.find(filter)
      .sort(sort)
      .skip((filters.page - 1) * filters.pageSize)
      .limit(filters.pageSize)
      .lean(),
    Property.countDocuments(filter),
  ]);
  const totalPages = Math.ceil(total / filters.pageSize);

  return {
    items: docs.map(serializePublicProperty),
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages,
  };
}

export async function getPublicPropertyById(
  id: string,
): Promise<PublicProperty | null> {
  if (!isValidObjectId(id)) {
    return null;
  }

  await connectDB();

  const doc = await Property.findOne({
    _id: id,
    moderationStatus: "approved",
    deletedAt: null,
  }).lean();

  return doc ? serializePublicProperty(doc) : null;
}
