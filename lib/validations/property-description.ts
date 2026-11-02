import { z } from "zod";
import {
  PROPERTY_CONDITIONS,
  PROPERTY_EQUIPMENTS,
  PROPERTY_TYPES,
} from "@/lib/constants/property";

const optionalText = (max: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(max).optional(),
  );

const optionalNumber = (min: number, max: number, integer = false) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.coerce
      .number()
      .finite()
      .min(min)
      .max(max)
      .refine((value) => !integer || Number.isInteger(value))
      .optional(),
  );

export const propertyDescriptionInputSchema = z.object({
  type: z.enum(PROPERTY_TYPES),
  city: z.string().trim().min(2).max(80),
  zone: optionalText(60),
  surface: z.coerce.number().finite().min(1).max(20000),
  bedrooms: optionalNumber(0, 8, true),
  bathrooms: optionalNumber(0, 8, true),
  condition: z.enum(PROPERTY_CONDITIONS),
  equipments: z.array(z.enum(PROPERTY_EQUIPMENTS)).max(11),
  price: z.coerce.number().finite().min(1).max(100000),
  rules: optionalText(2000),
});

export const generatedPropertyDescriptionSchema = z
  .string()
  .trim()
  .min(50)
  .max(2000);

export type PropertyDescriptionInput = z.infer<
  typeof propertyDescriptionInputSchema
>;
