import "server-only";
import mongoose, { Schema, type Model } from "mongoose";

export type InsightKind = "summary" | "alerts";
export type InsightSource = "ai" | "template";
export type InsightAlertLevel = "risk" | "exceeded";

export interface IBudgetInsightAlert {
  categoryKey: string;
  level: InsightAlertLevel;
  crossingDay?: number;
  text: string;
}

export interface IBudgetInsight {
  userId: mongoose.Types.ObjectId;
  month: string;
  kind: InsightKind;
  source: InsightSource;
  text?: string;
  alerts?: IBudgetInsightAlert[];
  inputFingerprint: string;
  generatedAt: Date;
  lastAiAttemptAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BudgetInsightAlertSchema = new Schema<IBudgetInsightAlert>(
  {
    categoryKey: {
      type: String,
      required: true,
      trim: true,
    },

    level: {
      type: String,
      enum: ["risk", "exceeded"],
      required: true,
    },

    crossingDay: {
      type: Number,
      min: [1, "Le jour estimé doit être compris entre 1 et 31."],
      max: [31, "Le jour estimé doit être compris entre 1 et 31."],
    },

    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [300, "Le message d'alerte ne doit pas dépasser 300 caractères."],
    },
  },
  { _id: false },
);

const BudgetInsightSchema = new Schema<IBudgetInsight>(
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

    kind: {
      type: String,
      enum: ["summary", "alerts"],
      required: true,
    },

    source: {
      type: String,
      enum: ["ai", "template"],
      required: true,
    },

    text: {
      type: String,
      trim: true,
      maxlength: [600, "Le résumé ne doit pas dépasser 600 caractères."],
      required: function (this: IBudgetInsight): boolean {
        return this.kind === "summary";
      },
    },

    alerts: {
      type: [BudgetInsightAlertSchema],
      required: function (this: IBudgetInsight): boolean {
        return this.kind === "alerts";
      },
    },

    inputFingerprint: {
      type: String,
      required: true,
    },

    generatedAt: {
      type: Date,
      required: true,
    },

    lastAiAttemptAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

BudgetInsightSchema.index({ userId: 1, month: 1, kind: 1 }, { unique: true });

const BudgetInsight: Model<IBudgetInsight> =
  (mongoose.models.BudgetInsight as Model<IBudgetInsight>) ||
  mongoose.model<IBudgetInsight>("BudgetInsight", BudgetInsightSchema);

export default BudgetInsight;
