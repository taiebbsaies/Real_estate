import "server-only";
import mongoose, { Schema, type Model } from "mongoose";
import { BUDGET_CATEGORIES, type BudgetCategory } from "@/lib/constants/budget";

export interface IExpense {
  userId: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  category: BudgetCategory;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const isIntegerMillimes = {
  validator: (value: number) => Number.isInteger(value),
  message: "Les montants sont stockés en millimes (entiers).",
};

const ExpenseSchema = new Schema<IExpense>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: [1, "Le montant doit être supérieur à 0."],
      validate: isIntegerMillimes,
    },

    date: {
      type: Date,
      required: true,
    },

    category: {
      type: String,
      enum: BUDGET_CATEGORIES,
      required: true,
    },

    note: {
      type: String,
      trim: true,
      maxlength: [200, "La note ne doit pas dépasser 200 caractères."],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

ExpenseSchema.index({ userId: 1, date: -1 });

const Expense: Model<IExpense> =
  (mongoose.models.Expense as Model<IExpense>) ||
  mongoose.model<IExpense>("Expense", ExpenseSchema);

export default Expense;
