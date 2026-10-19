import { z } from "zod";
import { BUDGET_CATEGORIES } from "@/lib/constants/budget";
import { tndToMillimes } from "@/lib/budget/calculations";

const millimesAmount = z
  .union([z.string(), z.number()])
  .transform((value) => tndToMillimes(value))
  .refine((millimes) => Number.isInteger(millimes) && millimes > 0, {
    error: "Le montant doit être supérieur à 0.",
  });

const optionalMillimesAmount = z
  .union([z.string(), z.number()])
  .optional()
  .transform((value) => {
    if (value === undefined || (typeof value === "string" && value === "")) {
      return undefined;
    }

    return tndToMillimes(value);
  })
  .refine(
    (millimes) =>
      millimes === undefined || (Number.isInteger(millimes) && millimes >= 0),
    { error: "Le revenu doit être supérieur ou égal à 0." },
  );

const monthField = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mois invalide (format attendu : YYYY-MM).");

const isoDayField = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide (format attendu : YYYY-MM-DD).")
  .transform((value) => new Date(`${value}T00:00:00.000Z`))
  .refine((date) => !Number.isNaN(date.getTime()), {
    error: "Date invalide (format attendu : YYYY-MM-DD).",
  });

const categoryField = z.enum(BUDGET_CATEGORIES, {
  error: "Catégorie invalide.",
});

const noteField = z
  .string()
  .trim()
  .max(200, "La note ne doit pas dépasser 200 caractères.")
  .transform((value) => (value === "" ? undefined : value))
  .optional();

export const budgetSchema = z.object({
  month: monthField,
  limit: millimesAmount,
  income: optionalMillimesAmount,
});

export const expenseSchema = z.object({
  amount: millimesAmount,
  date: isoDayField,
  category: categoryField,
  note: noteField,
});

export const updateExpenseSchema = z.object({
  id: z.string().trim().min(1, "Identifiant de dépense manquant."),
  amount: millimesAmount,
  date: isoDayField,
  category: categoryField,
  note: noteField,
});

export const deleteExpenseSchema = z.object({
  id: z.string().trim().min(1, "Identifiant de dépense manquant."),
});

export type BudgetInput = z.infer<typeof budgetSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;