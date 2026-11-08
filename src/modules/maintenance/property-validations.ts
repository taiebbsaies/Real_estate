import { z } from "zod";

export const propertyInputSchema = z.object({
  title: z.string().trim().min(2, "Le titre doit contenir au moins 2 caractères.").max(120),
  address: z.string().trim().min(3, "L'adresse est obligatoire.").max(200),
  city: z.string().trim().min(2, "La ville est obligatoire.").max(80),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{4,5}$/, "Code postal invalide (4 ou 5 chiffres)."),
});

/** Admin only: the owner the property is created for. */
export const createPropertySchema = propertyInputSchema.extend({
  ownerEmail: z.string().trim().toLowerCase().email("E-mail du propriétaire invalide.").optional(),
});

export type PropertyInput = z.infer<typeof propertyInputSchema>;

export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message || "Données invalides.";
}
