import "server-only";
import type { Types } from "mongoose";
import type { ReportReason } from "@/lib/validations/report";
import type {
  PropertyModerationStatus,
  PropertyType,
} from "@/lib/constants/property";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
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
  images: string[];
  coverImage?: string;
  moderationStatus: PropertyModerationStatus;
  moderationReason?: string;
  reportCount: number;
  createdAt: string;
  updatedAt: string;
  owner: {
    name: string;
    email: string;
  };
};

export type ModerationCounts = {
  pending: number;
  approved: number;
  rejected: number;
  reports: number;
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
    .sort({ createdAt: -1 })
    .select(
      "_id ownerId title city zone price type images coverImage moderationStatus moderationReason createdAt updatedAt",
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
    images: property.images,
    coverImage: property.coverImage,
    moderationStatus: property.moderationStatus,
    moderationReason: property.moderationReason,
    reportCount: reportCountByProperty.get(String(property._id)) ?? 0,
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString(),
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

  const [pending, approved, rejected, reports] = await Promise.all([
    Property.countDocuments({ moderationStatus: "pending", deletedAt: null }),
    Property.countDocuments({ moderationStatus: "approved", deletedAt: null }),
    Property.countDocuments({ moderationStatus: "rejected", deletedAt: null }),
    Report.countDocuments({ status: "open" }),
  ]);

  return { pending, approved, rejected, reports };
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
    Property.find({ _id: { $in: propertyIds } })
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
