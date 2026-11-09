import { z } from "zod";
import { TECHNICIAN_SKILLS, TUNISIA_GOVERNORATES } from "@/lib/constants/technician";

const skillValues = TECHNICIAN_SKILLS.map((skill) => skill.value) as string[];
const cityNames = TUNISIA_GOVERNORATES.map((governorate) => governorate.name) as string[];

// Blank optional inputs arrive as "" and must not be coerced to 0.
const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
    schema.optional(),
  );

export const technicianDetailsSchema = z.object({
  skills: z
    .array(z.string().refine((skill) => skillValues.includes(skill), "Spécialité invalide."))
    .min(1, "Sélectionnez au moins une spécialité."),
  city: z.string().refine((city) => cityNames.includes(city), "Sélectionnez votre gouvernorat."),
  address: z.string().trim().max(200, "L'adresse est trop longue."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9\s-]{7,19}$/, "Entrez un numéro de téléphone valide."),
  yearsExperience: optionalNumber(
    z
      .number("Entrez un nombre valide.")
      .int("Entrez un nombre entier.")
      .min(0, "La valeur ne peut pas être négative.")
      .max(60, "La valeur est trop élevée."),
  ),
  hourlyRateDT: optionalNumber(
    z
      .number("Entrez un nombre valide.")
      .min(0, "La valeur ne peut pas être négative.")
      .max(1000, "La valeur est trop élevée."),
  ),
  isAvailable: z.boolean(),
});

export type TechnicianDetails = z.infer<typeof technicianDetailsSchema>;

export function parseTechnicianDetails(formData: FormData) {
  return technicianDetailsSchema.safeParse({
    skills: formData.getAll("skills").map(String),
    city: formData.get("city")?.toString() ?? "",
    address: formData.get("address")?.toString() ?? "",
    phone: formData.get("phone")?.toString() ?? "",
    yearsExperience: formData.get("yearsExperience")?.toString() ?? "",
    hourlyRateDT: formData.get("hourlyRateDT")?.toString() ?? "",
    isAvailable: formData.get("isAvailable") === "on",
  });
}
