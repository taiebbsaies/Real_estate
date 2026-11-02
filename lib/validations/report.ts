import { z } from "zod";

export const reportReasons = [
  "fraud",
  "wrong_info",
  "unavailable",
  "inappropriate",
  "other",
] as const;

export const reportReasonLabels: Record<
  (typeof reportReasons)[number],
  string
> = {
  fraud: "Fraude ou annonce suspecte",
  wrong_info: "Informations incorrectes",
  unavailable: "Logement indisponible",
  inappropriate: "Contenu inapproprié",
  other: "Autre motif",
};

const optionalCommentSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(10).max(500).optional(),
);

export const reportSchema = z
  .object({
    propertyId: z.string().trim().regex(/^[a-f\d]{24}$/i),
    reason: z.enum(reportReasons),
    comment: optionalCommentSchema,
  })
  .refine((value) => value.reason !== "other" || value.comment !== undefined, {
    message: "Veuillez préciser votre signalement (10 à 500 caractères).",
    path: ["comment"],
  });

export type ReportReason = (typeof reportReasons)[number];
