import "server-only";
import mongoose, { Schema, type Model } from "mongoose";

export interface IBudget {
  userId: mongoose.Types.ObjectId;
  month: string;
  limit: number;
  income?: number;
  createdAt: Date;
  updatedAt: Date;
}

const isIntegerMillimes = {
  validator: (value: number) => Number.isInteger(value),
  message: "Les montants sont stockés en millimes (entiers).",
};

const BudgetSchema = new Schema<IBudget>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    month: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Mois invalide (format attendu : YYYY-MM)."],
    },

    limit: {
      type: Number,
      required: true,
      min: [1, "Le plafond doit être supérieur à 0."],
      validate: isIntegerMillimes,
    },

    income: {
      type: Number,
      min: [0, "Le revenu ne peut pas être négatif."],
      validate: isIntegerMillimes,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

BudgetSchema.index({ userId: 1, month: 1 }, { unique: true });

const Budget: Model<IBudget> =
  (mongoose.models.Budget as Model<IBudget>) ||
  mongoose.model<IBudget>("Budget", BudgetSchema);

export default Budget;
