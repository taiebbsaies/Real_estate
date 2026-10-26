import type { PipelineStage } from "mongoose";
import type { ComplaintCategory, ComplaintStatus } from "@/lib/constants/complaint";
import type { StatisticsPeriodRange } from "@/lib/complaints/statistics";

export type StatisticsAllTimeRow = {
  pending: number;
  in_progress: number;
  resolved: number;
  rejected: number;
  urgent: number;
};

export type StatisticsStatusRow = { _id: ComplaintStatus; count: number };
export type StatisticsCategoryRow = {
  _id: ComplaintCategory;
  count: number;
};
export type StatisticsMonthRow = { _id: string; count: number };
export type StatisticsResolutionRow = {
  averageMs: number | null;
  sampleSize: number;
};

export type StatisticsFacet = {
  allTime: StatisticsAllTimeRow[];
  periodStatuses: StatisticsStatusRow[];
  categories: StatisticsCategoryRow[];
  monthly: StatisticsMonthRow[];
  resolution: StatisticsResolutionRow[];
};

/**
 * The single aggregation behind the owner statistics dashboard. Kept free of
 * authentication/connection concerns so the calculation can be verified in
 * isolation against a real MongoDB instance.
 */
export function buildComplaintStatisticsPipeline(
  scopeMatch: Record<string, unknown>,
  range: StatisticsPeriodRange,
): PipelineStage[] {
  const periodMatch = {
    createdAt: { $gte: range.start, $lte: range.end },
  };
  const resolutionMatch = {
    status: "resolved",
    resolvedAt: { $type: "date", $gte: range.start, $lte: range.end },
    // Ignore corrupt rows whose resolution predates their creation.
    $expr: { $gte: ["$resolvedAt", "$createdAt"] },
  };

  return [
    { $match: scopeMatch },
    {
      $facet: {
        allTime: [
          {
            $group: {
              _id: null,
              pending: {
                $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
              },
              in_progress: {
                $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
              },
              resolved: {
                $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
              },
              rejected: {
                $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
              },
              urgent: {
                $sum: { $cond: [{ $eq: ["$priority", "urgent"] }, 1, 0] },
              },
            },
          },
        ],
        periodStatuses: [
          { $match: periodMatch },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ],
        categories: [
          { $match: periodMatch },
          { $group: { _id: "$category", count: { $sum: 1 } } },
        ],
        monthly: [
          { $match: periodMatch },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m",
                  date: "$createdAt",
                  timezone: "UTC",
                },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ],
        resolution: [
          { $match: resolutionMatch },
          {
            $group: {
              _id: null,
              averageMs: { $avg: { $subtract: ["$resolvedAt", "$createdAt"] } },
              sampleSize: { $sum: 1 },
            },
          },
        ],
      },
    },
  ];
}
