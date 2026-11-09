import "server-only";
import { connectDB } from "@/lib/mongodb";
import Property from "@/models/property";
import { escapeRegex } from "@/lib/properties/public-queries";

export type PriceInsightLevel = "below" | "average" | "above";
export type PriceInsightScope = "city_type" | "city";

export type PriceInsight = {
  level: PriceInsightLevel;
  label: string;
  /** Listing price per m² divided by the comparable median price per m². */
  ratio: number;
  sampleSize: number;
  scope: PriceInsightScope;
};

export type PriceInsightInput = {
  id: string;
  city: string;
  type: string;
  price: number;
  surface: number;
};

// Comparable thresholds. A ratio below 0.85 means cheaper than the market,
// above 1.15 means more expensive; everything else is "average".
const BELOW_THRESHOLD = 0.85;
const ABOVE_THRESHOLD = 1.15;
// Minimum number of comparables (the listing itself excluded).
const MIN_CITY_TYPE_SAMPLE = 5;
const MIN_CITY_SAMPLE = 8;
// Land has no meaningful monthly rent per m².
const EXCLUDED_TYPES = new Set<string>(["land"]);

const LEVEL_LABELS: Record<PriceInsightLevel, string> = {
  below: "Bon prix",
  average: "Dans la moyenne",
  above: "Au-dessus du marché",
};

type AggregatedEntry = { id: unknown; ratio: number };
type AggregatedGroup = {
  _id: { city: string; type: string };
  entries: AggregatedEntry[];
};

function normalizeCity(value: string): string {
  return value.trim().toLowerCase();
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

function classify(ratio: number): PriceInsightLevel {
  if (ratio < BELOW_THRESHOLD) return "below";
  if (ratio > ABOVE_THRESHOLD) return "above";
  return "average";
}

/**
 * Compare each listing's price per m² to the median of comparable approved
 * listings. One batched aggregation is used for the whole page. Only aggregate
 * numbers (median, sample size) leave this module; no other listing is exposed.
 */
export async function computePriceInsights(
  items: PriceInsightInput[],
): Promise<Record<string, PriceInsight | null>> {
  try {
    const eligible = items.filter(
      (item) =>
        item.id.length > 0 &&
        item.city.trim().length > 0 &&
        !EXCLUDED_TYPES.has(item.type) &&
        Number.isFinite(item.price) &&
        item.price > 0 &&
        Number.isFinite(item.surface) &&
        item.surface > 0,
    );

    if (eligible.length === 0) {
      return {};
    }

    const cities = [
      ...new Set(eligible.map((item) => item.city.trim()).filter(Boolean)),
    ];

    await connectDB();

    const groups = await Property.aggregate<AggregatedGroup>([
      {
        $match: {
          moderationStatus: "approved",
          deletedAt: null,
          city: {
            $in: cities.map(
              (city) => new RegExp(`^${escapeRegex(city)}$`, "i"),
            ),
          },
          surface: { $gt: 0 },
          price: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: { city: "$city", type: "$type" },
          entries: {
            $push: {
              id: "$_id",
              ratio: { $divide: ["$price", "$surface"] },
            },
          },
        },
      },
    ]);

    const byCityType = new Map<string, AggregatedEntry[]>();
    const byCity = new Map<string, AggregatedEntry[]>();

    for (const group of groups) {
      if (!group._id?.city || EXCLUDED_TYPES.has(group._id.type)) {
        continue;
      }

      const entries = group.entries.filter(
        (entry) => Number.isFinite(entry.ratio) && entry.ratio > 0,
      );
      if (entries.length === 0) {
        continue;
      }

      const cityKey = normalizeCity(group._id.city);
      byCityType.set(`${cityKey}|${group._id.type}`, entries);
      const cityEntries = byCity.get(cityKey) ?? [];
      cityEntries.push(...entries);
      byCity.set(cityKey, cityEntries);
    }

    const result: Record<string, PriceInsight | null> = {};

    for (const item of eligible) {
      const cityKey = normalizeCity(item.city);
      const ownRatio = item.price / item.surface;

      const typeEntries = byCityType.get(`${cityKey}|${item.type}`) ?? [];
      const typeComparables = typeEntries
        .filter((entry) => String(entry.id) !== item.id)
        .map((entry) => entry.ratio);

      if (typeComparables.length >= MIN_CITY_TYPE_SAMPLE) {
        const reference = median(typeComparables);
        if (reference && reference > 0) {
          const ratio = ownRatio / reference;
          const level = classify(ratio);
          result[item.id] = {
            level,
            label: LEVEL_LABELS[level],
            ratio: Math.round(ratio * 100) / 100,
            sampleSize: typeComparables.length,
            scope: "city_type",
          };
          continue;
        }
      }

      const cityComparables = (byCity.get(cityKey) ?? [])
        .filter((entry) => String(entry.id) !== item.id)
        .map((entry) => entry.ratio);

      if (cityComparables.length >= MIN_CITY_SAMPLE) {
        const reference = median(cityComparables);
        if (reference && reference > 0) {
          const ratio = ownRatio / reference;
          const level = classify(ratio);
          result[item.id] = {
            level,
            label: LEVEL_LABELS[level],
            ratio: Math.round(ratio * 100) / 100,
            sampleSize: cityComparables.length,
            scope: "city",
          };
          continue;
        }
      }

      result[item.id] = null;
    }

    return result;
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.name : "UnknownError");
    return {};
  }
}
