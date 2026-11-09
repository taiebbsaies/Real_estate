import { z } from "zod";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g;

export const naturalSearchSchema = z.object({
  text: z.preprocess(
    (value) => {
      if (typeof value !== "string") return value;
      return value
        .replace(CONTROL_CHARACTERS, " ")
        .replace(/\s+/g, " ")
        .trim();
    },
    z
      .string()
      .min(3, "Saisissez au moins 3 caractères.")
      .max(300, "La recherche ne doit pas dépasser 300 caractères."),
  ),
});

export type NaturalSearchInput = z.infer<typeof naturalSearchSchema>;
