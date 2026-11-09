import "server-only";
import type { Types } from "mongoose";
import type { ReportReason } from "@/lib/validations/report";
import type {
  PropertyAvailability,
  PropertyCondition,
  PropertyEquipment,
  PropertyModerationStatus,
  PropertyType,
} from "@/lib/constants/property";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { computeQualityScore, type QualityScore } from "@/lib/properties/quality-score";
import Property from "@/models/property";
import Report from "@/models/Report";
import User from "@/models/user";

export type ModerationProperty = {
  _id: string;
  title: string;
  city: string;
  zone?: string;
  price: number;
  type: PropertyType;
  surface: number;
  bedrooms?: number;
  bathrooms?: number;
  images: string[];
  coverImage?: string;
  moderationStatus: PropertyModerationStatus;
  moderationReason?: string;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
  quality: QualityScore;
  owner: {
    name: string;
    email: string;
  };
};

export type ModerationCounts = {
  pending: number | null;
  approved: number | null;
  rejected: number | null;
  reports: number | null;
};

export type OpenReportGroup = {
  propertyId: string;
  propertyTitle: string;
  city: string;
  zone?: string;
  moderationStatus: PropertyModerationStatus;
  reportCount: number;
  reports: {
    _id: string;
    reason: ReportReason;
    comment?: string;
    reporterEmail: string;
    createdAt: string;
  }[];
};

export async function getPropertiesForModeration(
  status: "pending" | "approved" | "rejected",
  sortDirection: "asc" | "desc" = "desc",
): Promise<ModerationProperty[]> {
  const session = await getSession();
  if (!session || session.activeRole !== "ADMIN") {
    return [];
  }

  await connectDB();

  const properties = await Property.find({
    moderationStatus: status,
    deletedAt: null,
  })
    .sort({ createdAt: sortDirection })
    .select(
      "_id ownerId title description city zone address latitude longitude price type surface bedrooms bathrooms availableFrom equipments images coverImage rules moderationStatus moderationReason createdAt updatedAt",
    )
    .lean();

  if (properties.length === 0) {
    return [];
  }

  const reportCounts = await Report.aggregate<{
    _id: Types.ObjectId;
    count: number;
  }>([
    { $match: { status: "open", propertyId: { $in: properties.map((item) => item._id) } } },
    { $group: { _id: "$propertyId", count: { $sum: 1 } } },
  ]);
  const reportCountByProperty = new Map(
    reportCounts.map((entry) => [String(entry._id), entry.count]),
  );

  const ownerIds = [
    ...new Set(properties.map((property) => String(property.ownerId))),
  ];
  const owners = await User.find({
    _id: { $in: ownerIds },
    deletedAt: null,
  })
    .select("_id firstName lastName email")
    .lean();
  const ownersById = new Map(
    owners.map((owner) => [
      String(owner._id),
      {
        name: `${owner.firstName} ${owner.lastName}`.trim(),
        email: owner.email,
      },
    ]),
  );

  return properties.map((property) => ({
    _id: String(property._id),
    title: property.title,
    city: property.city,
    zone: property.zone,
    price: property.price,
    type: property.type,
    surface: property.surface,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    images: property.images,
    coverImage: property.coverImage,
    moderationStatus: property.moderationStatus,
    moderationReason: property.moderationReason,
    reportCount: reportCountByProperty.get(String(property._id)) ?? 0,
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString(),
    quality: computeQualityScore(property),
    owner: ownersById.get(String(property.ownerId)) ?? {
      name: "Propriétaire indisponible",
      email: "",
    },
  }));
}

export async function getModerationCounts(): Promise<ModerationCounts> {
  const session = await getSession();
  if (!session || session.activeRole !== "ADMIN") {
    return { pending: 0, approved: 0, rejected: 0, reports: 0 };
  }

  await connectDB();

  const [pending, approved, rejected, reportCounts] =
    await Promise.allSettled([
      Property.countDocuments({ moderationStatus: "pending", deletedAt: null }),
      Property.countDocuments({ moderationStatus: "approved", deletedAt: null }),
      Property.countDocuments({ moderationStatus: "rejected", deletedAt: null }),
      Report.aggregate<{ total: number }>([
        { $match: { status: "open" } },
        {
          $lookup: {
            from: Property.collection.name,
            localField: "propertyId",
            foreignField: "_id",
            as: "property",
          },
        },
        { $unwind: "$property" },
        { $match: { "property.deletedAt": null } },
        { $count: "total" },
      ]),
    ]);

  const countOrNull = <T,>(result: PromiseSettledResult<T>): T | null => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    console.error(
      result.reason instanceof Error ? result.reason.name : "UnknownError",
    );
    return null;
  };

  const reportCountResult = countOrNull(reportCounts);

  return {
    pending: countOrNull(pending),
    approved: countOrNull(approved),
    rejected: countOrNull(rejected),
    reports: reportCountResult?.[0]?.total ?? (reportCountResult ? 0 : null),
  };
}

export async function getOpenReportsByProperty(): Promise<OpenReportGroup[]> {
  const session = await getSession();
  if (!session || session.activeRole !== "ADMIN") {
    return [];
  }

  await connectDB();

  const reports = await Report.find({ status: "open" })
    .sort({ createdAt: -1 })
    .select("_id propertyId reporterId reason comment createdAt")
    .lean();
  if (reports.length === 0) {
    return [];
  }

  const propertyIds = [...new Set(reports.map((report) => String(report.propertyId)))];
  const reporterIds = [...new Set(reports.map((report) => String(report.reporterId)))];
  const [properties, reporters] = await Promise.all([
    Property.find({ _id: { $in: propertyIds }, deletedAt: null })
      .select("_id title city zone moderationStatus")
      .lean(),
    User.find({ _id: { $in: reporterIds } })
      .select("_id email")
      .lean(),
  ]);
  const propertyById = new Map(
    properties.map((property) => [String(property._id), property]),
  );
  const emailByReporterId = new Map(
    reporters.map((reporter) => [String(reporter._id), reporter.email]),
  );
  const groupByPropertyId = new Map<string, OpenReportGroup>();

  for (const report of reports) {
    const propertyId = String(report.propertyId);
    const property = propertyById.get(propertyId);
    if (!property) {
      continue;
    }

    let group = groupByPropertyId.get(propertyId);
    if (!group) {
      group = {
        propertyId,
        propertyTitle: property.title,
        city: property.city,
        zone: property.zone,
        moderationStatus: property.moderationStatus,
        reportCount: 0,
        reports: [],
      };
      groupByPropertyId.set(propertyId, group);
    }

    group.reportCount += 1;
    group.reports.push({
      _id: String(report._id),
      reason: report.reason,
      comment: report.comment,
      reporterEmail:
        emailByReporterId.get(String(report.reporterId)) ?? "Compte indisponible",
      createdAt: report.createdAt.toISOString(),
    });
  }

  return [...groupByPropertyId.values()];
}

export type ModerationPropertyDetail = {
  _id: string;
  title: string;
  description: string;
  price: number;
  city: string;
  zone?: string;
  address: string;
  latitude: number;
  longitude: number;
  surface: number;
  bedrooms?: number;
  bathrooms?: number;
  type: PropertyType;
  condition: PropertyCondition;
  availability: PropertyAvailability;
  equipments: PropertyEquipment[];
  rules?: string;
  images: string[];
  coverImage?: string;
  moderationStatus: PropertyModerationStatus;
  moderationReason?: string;
  createdAt: string;
  updatedAt: string;
};

// ADMIN-only read of a full listing for the moderation detail panel.
// Does not reuse the public queries: moderation owns its own read model.
export async function getModerationPropertyById(
  propertyId: string,
): Promise<ModerationPropertyDetail | null> {
  const session = await getSession();
  if (!session || session.activeRole !== "ADMIN") {
    return null;
  }

  await connectDB();

  const property = await Property.findOne({
    _id: propertyId,
    deletedAt: null,
  })
    .select(
      "_id title description price city zone address latitude longitude surface bedrooms bathrooms type condition availability equipments images coverImage rules moderationStatus moderationReason createdAt updatedAt",
    )
    .lean();

  if (!property) {
    return null;
  }

  return {
    _id: String(property._id),
    title: property.title,
    description: property.description,
    price: property.price,
    city: property.city,
    zone: property.zone,
    address: property.address,
    latitude: property.latitude,
    longitude: property.longitude,
    surface: property.surface,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    type: property.type,
    condition: property.condition,
    availability: property.availability,
    equipments: property.equipments,
    rules: property.rules,
    images: property.images,
    coverImage: property.coverImage,
    moderationStatus: property.moderationStatus,
    moderationReason: property.moderationReason,
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString(),
  };
}
