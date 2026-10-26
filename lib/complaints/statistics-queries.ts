import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import Complaint from "@/models/complaint";
import { isTestPropertiesEnabled } from "@/lib/test-properties/config";
import { getOwnedTestPropertyIds } from "@/lib/test-properties/queries";
import {
  composeCategoryStats,
  composeMonthlyStats,
  composeStatusCounts,
  getStatisticsPeriodRange,
  type CategoryStat,
  type ComplaintStatusCounts,
  type MonthlyStat,
  type StatisticsPeriod,
} from "@/lib/complaints/statistics";
import {
  buildComplaintStatisticsPipeline,
  type StatisticsFacet,
} from "@/lib/complaints/statistics-pipeline";

export type ComplaintResolutionStat = {
  averageMs: number | null;
  sampleSize: number;
};

export type ComplaintStatistics = {
  /** All-time counts, independent from the selected reporting period. */
  allTime: ComplaintStatusCounts;
  period: {
    months: StatisticsPeriod;
    start: string;
    end: string;
    /** Complaints created during the selected period. */
    total: number;
    categories: CategoryStat[];
    monthly: MonthlyStat[];
    resolution: ComplaintResolutionStat;
  };
};

/**
 * Mirror the owner visibility rules used by the complaint list: owners see
 * legacy complaints without an apartment and complaints on their own test
 * apartments. Admins see everything.
 */
async function buildOwnerScopeMatch(
  userId: string,
): Promise<Record<string, unknown>> {
  if (!isTestPropertiesEnabled()) return {};

  const ownedPropertyIds = await getOwnedTestPropertyIds(userId);
  return {
    $or: [
      { propertyId: { $exists: false } },
      { propertyId: null },
      {
        propertyId: {
          $in: ownedPropertyIds.map((id) => new Types.ObjectId(id)),
        },
      },
    ],
  };
}

/**
 * One aggregation returns every statistic required by the owner dashboard.
 * Only aggregate values leave the database: no tenant, technician or complaint
 * document is exposed to the client.
 */
export async function getComplaintStatistics(
  period: StatisticsPeriod,
  now: Date = new Date(),
): Promise<ComplaintStatistics | null> {
  const session = await getSession();
  if (!session) return null;

  if (session.activeRole !== "OWNER" && session.activeRole !== "ADMIN") {
    return null;
  }

  await connectDB();

  const range = getStatisticsPeriodRange(period, now);

  const scopeMatch =
    session.activeRole === "OWNER"
      ? await buildOwnerScopeMatch(session.userId)
      : {};

  const rows = await Complaint.aggregate<StatisticsFacet>(
    buildComplaintStatisticsPipeline(scopeMatch, range),
  );

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

  const periodStatuses = result?.periodStatuses ?? [];
  const periodTotal = periodStatuses.reduce((sum, row) => sum + row.count, 0);

  const resolutionRow = result?.resolution[0];
  const rawAverage = resolutionRow?.averageMs;
  const averageMs =
    typeof rawAverage === "number" &&
    Number.isFinite(rawAverage) &&
    rawAverage >= 0
      ? rawAverage
      : null;

  return {
    allTime,
    period: {
      months: period,
      start: range.start.toISOString(),
      end: range.end.toISOString(),
      total: periodTotal,
      categories: composeCategoryStats(result?.categories ?? []),
      monthly: composeMonthlyStats(range.months, result?.monthly ?? []),
      resolution: {
        averageMs,
        sampleSize: resolutionRow?.sampleSize ?? 0,
      },
    },
  };
}
