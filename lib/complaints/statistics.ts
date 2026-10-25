import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUSES,
  type ComplaintCategory,
  type ComplaintStatus,
} from "@/lib/constants/complaint";

export const STATISTICS_PERIODS = [6, 12] as const;
export type StatisticsPeriod = (typeof STATISTICS_PERIODS)[number];

export const DEFAULT_STATISTICS_PERIOD: StatisticsPeriod = 6;

const FRENCH_SHORT_MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
] as const;

const MINUTE_MS = 60 * 1000;

export type StatisticsMonth = {
  /** UTC year-month key, e.g. "2026-10". */
  key: string;
  /** French label, e.g. "oct. 2026". */
  label: string;
};

export type StatisticsPeriodRange = {
  start: Date;
  /** Upper bound used by queries. Always the current server time. */
  end: Date;
  months: StatisticsMonth[];
};

export type CategoryStat = {
  category: ComplaintCategory;
  count: number;
};

export type MonthlyStat = StatisticsMonth & {
  count: number;
};

export type ComplaintStatusCounts = Record<ComplaintStatus, number> & {
  total: number;
  urgent: number;
};

/**
 * Only accept the periods the dashboard explicitly supports. Any missing or
 * tampered value falls back to the default instead of reaching the pipeline.
 */
export function parseStatisticsPeriod(
  value: string | string[] | undefined,
): StatisticsPeriod {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "12" ? 12 : DEFAULT_STATISTICS_PERIOD;
}

export function isStatisticsPeriod(
  value: number,
): value is StatisticsPeriod {
  return STATISTICS_PERIODS.includes(value as StatisticsPeriod);
}

/**
 * Build the current UTC month window. "Last 6 months" includes the current
 * (partial) month plus the five preceding months. All month arithmetic is done
 * in UTC so a year boundary never shifts a complaint into the wrong bucket.
 */
export function getStatisticsPeriodRange(
  period: StatisticsPeriod,
  now: Date = new Date(),
): StatisticsPeriodRange {
  const end = new Date(now.getTime());
  const start = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (period - 1), 1),
  );

  const months: StatisticsMonth[] = [];
  for (let index = 0; index < period; index += 1) {
    const date = new Date(
      Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - (period - 1 - index), 1),
    );
    const month = date.getUTCMonth();
    months.push({
      key: `${date.getUTCFullYear()}-${String(month + 1).padStart(2, "0")}`,
      label: `${FRENCH_SHORT_MONTHS[month]} ${date.getUTCFullYear()}`,
    });
  }

  return { start, end, months };
}

export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Fill the complete category list, including categories with zero complaints,
 * then rank by count. Ties keep the application's canonical category order so
 * the dashboard is stable between refreshes.
 */
export function composeCategoryStats(
  rows: readonly { _id: ComplaintCategory; count: number }[],
): CategoryStat[] {
  const counts = new Map<ComplaintCategory, number>();
  for (const row of rows) {
    if (COMPLAINT_CATEGORIES.includes(row._id)) {
      counts.set(row._id, row.count);
    }
  }

  const order = new Map<ComplaintCategory, number>(
    COMPLAINT_CATEGORIES.map((category, index) => [category, index]),
  );

  return COMPLAINT_CATEGORIES.map((category) => ({
    category,
    count: counts.get(category) ?? 0,
  })).sort(
    (left, right) =>
      right.count - left.count ||
      (order.get(left.category) ?? 0) - (order.get(right.category) ?? 0),
  );
}

/**
 * Fill every month of the selected range with a zero default, so reports never
 * skip a month that had no complaints.
 */
export function composeMonthlyStats(
  months: readonly StatisticsMonth[],
  rows: readonly { _id: string; count: number }[],
): MonthlyStat[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row._id, row.count);
  }

  return months.map((month) => ({
    ...month,
    count: counts.get(month.key) ?? 0,
  }));
}

export function composeStatusCounts(
  counts: Partial<Record<ComplaintStatus, number>>,
  urgent: number,
): ComplaintStatusCounts {
  const normalized = Object.fromEntries(
    COMPLAINT_STATUSES.map((status) => [status, counts[status] ?? 0]),
  ) as Record<ComplaintStatus, number>;

  const total = COMPLAINT_STATUSES.reduce(
    (sum, status) => sum + normalized[status],
    0,
  );

  return { ...normalized, total, urgent };
}

/**
 * Human-readable duration for the average resolution card. Returns null when
 * there is no valid measurement so the UI can show a dedicated empty state.
 */
export function formatResolutionDuration(
  durationMs: number | null | undefined,
): string | null {
  if (
    durationMs === null ||
    durationMs === undefined ||
    !Number.isFinite(durationMs) ||
    durationMs < 0
  ) {
    return null;
  }

  if (durationMs < MINUTE_MS) return "< 1 min";

  const totalMinutes = Math.round(durationMs / MINUTE_MS);

  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return hours > 0 ? `${days} j ${hours} h` : `${days} j`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
  }
  return `${minutes} min`;
}

type OwnerComplaintsHrefOptions = {
  status?: ComplaintStatus | null;
  period?: StatisticsPeriod;
};

/**
 * Keep the status filter and reporting period independent when navigating.
 * The default period is omitted from the URL to preserve existing links.
 */
export function buildOwnerComplaintsHref({
  status,
  period,
}: OwnerComplaintsHrefOptions = {}): string {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (period === 12) params.set("period", "12");
  const query = params.toString();
  return `/dashboard/owner/complaints${query ? `?${query}` : ""}`;
}
