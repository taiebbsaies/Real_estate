"use server";

import { isValidObjectId, type UpdateQuery } from "mongoose";
import { updateTag } from "next/cache";
import { ZodError } from "zod";
import { connectDB } from "@/lib/mongodb";
import Budget from "@/models/budget";
import Expense from "@/models/expense";
import type { IBudget } from "@/models/budget";
import { getUserId } from "@/lib/budget/current-user";
import { budgetCacheTag } from "@/lib/budget/queries";
import {
  budgetSchema,
  deleteExpenseSchema,
  expenseSchema,
  updateExpenseSchema,
} from "@/lib/validations/budget";

export type BudgetActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

function fieldErrors(error: ZodError): Record<string, string[]> {
  const errors = error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(errors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  );
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function upsertBudget(
  _previousState: BudgetActionState | null,
  formData: FormData,
): Promise<BudgetActionState> {
  const parsed = budgetSchema.safeParse({
    month: formData.get("month"),
    limit: formData.get("limit"),
    income: formData.get("income") ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Veuillez corriger les champs en surbrillance.",
      errors: fieldErrors(parsed.error),
    };
  }

  try {
    const userId = await getUserId();
    await connectDB();

    const { month, limit, income } = parsed.data;

    const update: UpdateQuery<IBudget> = {
      $set: { limit, ...(income !== undefined ? { income } : {}) },
      ...(income === undefined ? { $unset: { income: "" } } : {}),
    };

    const upsertOptions = {
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    };

    try {
      await Budget.findOneAndUpdate({ userId, month }, update, upsertOptions);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        await Budget.findOneAndUpdate({ userId, month }, update, upsertOptions);
      } else {
        throw error;
      }
    }

    updateTag(budgetCacheTag(userId));

    return { success: true, message: "Budget enregistré." };
  } catch (error: unknown) {
    console.error("upsertBudget failed:", error);

    return {
      success: false,
      message: "Impossible d'enregistrer le budget. Veuillez réessayer.",
    };
  }
}

export async function createExpense(
  _previousState: BudgetActionState | null,
  formData: FormData,
): Promise<BudgetActionState> {
  const parsed = expenseSchema.safeParse({
    amount: formData.get("amount"),
    date: formData.get("date"),
    category: formData.get("category"),
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Veuillez corriger les champs en surbrillance.",
      errors: fieldErrors(parsed.error),
    };
  }

  try {
    const userId = await getUserId();
    await connectDB();

    await Expense.create({ userId, ...parsed.data });

    updateTag(budgetCacheTag(userId));

    return { success: true, message: "Dépense enregistrée." };
  } catch (error: unknown) {
    console.error("createExpense failed:", error);

    return {
      success: false,
      message: "Impossible d'enregistrer la dépense. Veuillez réessayer.",
    };
  }
}

export async function updateExpense(
  _previousState: BudgetActionState | null,
  formData: FormData,
): Promise<BudgetActionState> {
  const parsed = updateExpenseSchema.safeParse({
    id: formData.get("id"),
    amount: formData.get("amount"),
    date: formData.get("date"),
    category: formData.get("category"),
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Veuillez corriger les champs en surbrillance.",
      errors: fieldErrors(parsed.error),
    };
  }

  const { id, amount, date, category, note } = parsed.data;

  if (!isValidObjectId(id)) {
    return { success: false, message: "Dépense introuvable." };
  }

  try {
    const userId = await getUserId();
    await connectDB();

    const result = await Expense.updateOne(
      { _id: id, userId },
      {
        $set: {
          amount,
          date,
          category,
          ...(note !== undefined ? { note } : {}),
        },
        ...(note === undefined ? { $unset: { note: "" } } : {}),
      },
    );

    if (result.matchedCount === 0) {
      return { success: false, message: "Dépense introuvable." };
    }

    updateTag(budgetCacheTag(userId));

    return { success: true, message: "Dépense modifiée." };
  } catch (error: unknown) {
    console.error("updateExpense failed:", error);

    return {
      success: false,
      message: "Impossible de modifier la dépense. Veuillez réessayer.",
    };
  }
}

export async function deleteExpense(
  _previousState: BudgetActionState | null,
  formData: FormData,
): Promise<BudgetActionState> {
  const parsed = deleteExpenseSchema.safeParse({
    id: formData.get("id"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Veuillez corriger les champs en surbrillance.",
      errors: fieldErrors(parsed.error),
    };
  }

  const { id } = parsed.data;

  if (!isValidObjectId(id)) {
    return { success: false, message: "Dépense introuvable." };
  }

  try {
    const userId = await getUserId();
    await connectDB();

    const result = await Expense.deleteOne({ _id: id, userId });

    if (result.deletedCount === 0) {
      return { success: false, message: "Dépense introuvable." };
    }

    updateTag(budgetCacheTag(userId));

    return { success: true, message: "Dépense supprimée." };
  } catch (error: unknown) {
    console.error("deleteExpense failed:", error);

    return {
      success: false,
      message: "Impossible de supprimer la dépense. Veuillez réessayer.",
    };
  }
}
