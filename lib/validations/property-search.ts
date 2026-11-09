import { z } from "zod";
import {
  PROPERTY_EQUIPMENTS,
  PROPERTY_TYPES,
  type PropertyEquipment,
} from "@/lib/constants/property";

const equipmentSet = new Set<string>(PROPERTY_EQUIPMENTS);

function firstStringParams(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    const firstValue = Array.isArray(value) ? value[0] : value;
    if (typeof firstValue === "string") {
      params[key] = firstValue;
    }
  }

  const selectedEquipments = new Set<PropertyEquipment>();
  for (const equipment of PROPERTY_EQUIPMENTS) {
    if (["1", "true", "on"].includes(params[`equipment_${equipment}`] ?? "")) {
      selectedEquipments.add(equipment);
    }
  }
  for (const value of (params.equipments ?? "").split(",")) {
    const equipment = value.trim();
    if (equipmentSet.has(equipment)) {
      selectedEquipments.add(equipment as PropertyEquipment);
    }
  }

  params.equipments = [...selectedEquipments].join(",");
  return params;
}

function optionalText(maxLength: number) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string") return undefined;
      const trimmed = value.trim();
      return trimmed.length > 0 && trimmed.length <= maxLength
        ? trimmed
        : undefined;
    },
    z.string().optional(),
  );
}

function optionalNumber(
  minimum: number,
  maximum: number,
  integer = false,
) {
  return z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.trim() === "") return undefined;
      const number = Number(value.trim());
      if (
        !Number.isFinite(number) ||
        number < minimum ||
        number > maximum ||
        (integer && !Number.isInteger(number))
      ) {
        return undefined;
      }
      return number;
    },
    z.number().optional(),
  );
}

const optionalType = z.preprocess(
  (value) =>
    typeof value === "string" &&
    (PROPERTY_TYPES as readonly string[]).includes(value)
      ? value
      : undefined,
  z.enum(PROPERTY_TYPES).optional(),
);

export const propertySearchSchema = z.preprocess(
  (input) => firstStringParams(input),
  z.object({
    city: optionalText(80),
    zone: optionalText(80),
    priceMin: optionalNumber(0, 100000),
    priceMax: optionalNumber(0, 100000),
    surfaceMin: optionalNumber(0, 20000),
    surfaceMax: optionalNumber(0, 20000),
    bedrooms: optionalNumber(0, 8, true),
    bathrooms: optionalNumber(0, 8, true),
    type: optionalType,
    equipments: z.preprocess(
      (value) =>
        typeof value === "string"
          ? value
              .split(",")
              .map((equipment) => equipment.trim())
              .filter((equipment) => equipmentSet.has(equipment))
          : [],
      z.array(z.enum(PROPERTY_EQUIPMENTS)).default([]),
    ),
    sort: z.preprocess(
      (value) =>
        value === "price_asc" || value === "price_desc" || value === "newest"
          ? value
          : undefined,
      z.enum(["newest", "price_asc", "price_desc"]).default("newest"),
    ),
    page: optionalNumber(1, Number.MAX_SAFE_INTEGER, true),
    pageSize: optionalNumber(1, 24, true),
  }),
);

const adminPageSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string" || value.trim() === "") return undefined;
    const number = Number(value.trim());
    return Number.isInteger(number) && number >= 1 ? number : undefined;
  },
  z.number().int().min(1).max(100).default(1),
);

export const adminModerationQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "reports"]).default("pending"),
  page: adminPageSchema,
});

export type AdminModerationQuery = z.infer<typeof adminModerationQuerySchema>;

export function parseAdminModerationQuery(
  raw: unknown,
): AdminModerationQuery {
  const parsed = adminModerationQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return { status: "pending", page: 1 };
  }
  return parsed.data;
}

type ParsedPropertySearchFilters = z.infer<typeof propertySearchSchema>;

export type PropertySearchFilters = Omit<
  ParsedPropertySearchFilters,
  "page" | "pageSize"
> & {
  page: number;
  pageSize: number;
};

export function parsePropertySearchParams(
  rawSearchParams: unknown,
): PropertySearchFilters {
  const parsed = propertySearchSchema.safeParse(rawSearchParams);
  if (parsed.success) {
    return {
      ...parsed.data,
      page: parsed.data.page ?? 1,
      pageSize: parsed.data.pageSize ?? 12,
    };
  }

  return {
    equipments: [],
    sort: "newest",
    page: 1,
    pageSize: 12,
  };
}
