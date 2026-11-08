"use server";

import { Types } from "mongoose";
import {
  APICallError,
  generateText,
  NoObjectGeneratedError,
  Output,
} from "ai";
import { connectDB } from "@/lib/mongodb";
import BudgetInsight, {
  type InsightKind,
  type InsightSource,
} from "@/models/budgetInsight";
import { getUserId } from "@/lib/budget/current-user";
import {
  currentMonthTunis,
  dayOfMonthTunis,
  daysInMonth,
  previousMonth,
} from "@/lib/budget/calculations";
import { getMonthSummary, listExpenses } from "@/lib/budget/queries";
import {
  buildInsightFingerprint,
  buildMonthlySummaryData,
  buildTemplateSummary,
  toInsightFingerprintInput,
  type MonthlySummaryInsight,
} from "@/lib/budget/insights";
import {
  buildCategoryProjections,
  buildTemplateAlertText,
  toPredictiveAlertViews,
  type PredictiveAlertsInsight,
  type PredictiveAlertView,
  type StoredInsightAlert,
} from "@/lib/budget/projections";
import { getExpenseModel } from "@/lib/ai/model";
import {
  buildMonthlySummaryInstructions,
  buildPredictiveAlertsInstructions,
} from "@/lib/ai/insight-prompt";
import {
  aiMonthlySummarySchema,
  aiPredictiveAlertsSchema,
  validateMonthlySummaryOutput,
  validatePredictiveAlertsOutput,
} from "@/lib/ai/insight-output";
import { checkRateLimit } from "@/lib/rate-limit";

export type MonthlySummaryActionState =
  | { ok: true; insight: MonthlySummaryInsight }
  | { ok: false; message: string };

export type PredictiveAlertsActionState =
  | { ok: true; insight: PredictiveAlertsInsight }
  | { ok: false; message: string };

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const AI_CALL_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const TEMPLATE_RETRY_DELAY_MS = 60 * 60 * 1000;
const RECHECK_WINDOW_MS = 30_000;

type LeanBudgetInsightDoc = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  month: string;
  kind: InsightKind;
  source: InsightSource;
  text?: string;
  alerts?: StoredInsightAlert[];
  inputFingerprint: string;
  generatedAt: Date;
  lastAiAttemptAt?: Date;
};

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function lastAttemptAt(doc: LeanBudgetInsightDoc): Date {
  return doc.lastAiAttemptAt ?? doc.generatedAt;
}

function toInsight(
  doc: LeanBudgetInsightDoc,
  fallbackText: string,
): MonthlySummaryInsight {
  return {
    text: doc.text ?? fallbackText,
    source: doc.source,
    generatedAt: doc.generatedAt.toISOString(),
  };
}

function toAlertsInsight(doc: LeanBudgetInsightDoc): PredictiveAlertsInsight {
  return {
    alerts: toPredictiveAlertViews(doc.alerts ?? []),
    source: doc.source,
    generatedAt: doc.generatedAt.toISOString(),
  };
}

async function upsertInsight(args: {
  userId: string;
  month: string;
  kind: InsightKind;
  source: InsightSource;
  inputFingerprint: string;
  now: Date;
  text?: string;
  alerts?: StoredInsightAlert[];
}): Promise<void> {
  const filter = {
    userId: args.userId,
    month: args.month,
    kind: args.kind,
  } as const;

  const update = {
    $set: {
      source: args.source,
      inputFingerprint: args.inputFingerprint,
      generatedAt: args.now,
      lastAiAttemptAt: args.now,
      ...(args.text !== undefined ? { text: args.text } : {}),
      ...(args.alerts !== undefined ? { alerts: args.alerts } : {}),
    },
  };

  const options = {
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  };

  try {
    await BudgetInsight.findOneAndUpdate(filter, update, options);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      await BudgetInsight.findOneAndUpdate(filter, update, options);
    } else {
      throw error;
    }
  }
}

export async function refreshMonthlySummary(
  monthInput: string,
): Promise<MonthlySummaryActionState> {
  if (typeof monthInput !== "string" || !MONTH_PATTERN.test(monthInput)) {
    return { ok: false, message: "Mois invalide." };
  }

  const userId = await getUserId();
  const now = new Date();

  try {
    await connectDB();

    const filter = {
      userId,
      month: monthInput,
      kind: "summary",
    } as const;

    if (monthInput !== currentMonthTunis(now)) {
      const cachedPast =
        await BudgetInsight.findOne(filter).lean<LeanBudgetInsightDoc>();

      if (cachedPast) {
        return {
          ok: true,
          insight: toInsight(cachedPast, "Résumé indisponible."),
        };
      }

      return {
        ok: false,
        message: "Le résumé mensuel n'est disponible que pour le mois en cours.",
      };
    }

    const [current, previous, expenses] = await Promise.all([
      getMonthSummary(userId, monthInput),
      getMonthSummary(userId, previousMonth(monthInput)),
      listExpenses(userId, { month: monthInput }),
    ]);

    const fingerprint = buildInsightFingerprint(
      toInsightFingerprintInput({ current, expenses }),
    );
    const data = buildMonthlySummaryData({
      month: monthInput,
      now,
      current,
      previous,
      expenses,
    });
    const templateText = buildTemplateSummary(data);

    const cached =
      await BudgetInsight.findOne(filter).lean<LeanBudgetInsightDoc>();

    if (cached) {
      const cachedInsight = toInsight(cached, templateText);

      if (cached.inputFingerprint === fingerprint) {
        const templateRetryNotDue =
          cached.source === "template" &&
          now.getTime() - lastAttemptAt(cached).getTime() <
            TEMPLATE_RETRY_DELAY_MS;

        if (cached.source === "ai" || templateRetryNotDue) {
          return { ok: true, insight: cachedInsight };
        }
      } else if (
        now.getTime() - lastAttemptAt(cached).getTime() <
        AI_CALL_COOLDOWN_MS
      ) {
        return { ok: true, insight: cachedInsight };
      }
    }

    if (
      !checkRateLimit(`ai-summary:${userId}`, { limit: 5, windowMs: 60_000 })
    ) {
      return {
        ok: true,
        insight: cached
          ? toInsight(cached, templateText)
          : {
              text: templateText,
              source: "template",
              generatedAt: now.toISOString(),
            },
      };
    }

    const recheck =
      await BudgetInsight.findOne(filter).lean<LeanBudgetInsightDoc>();

    if (
      recheck !== null &&
      recheck.inputFingerprint === fingerprint &&
      now.getTime() - lastAttemptAt(recheck).getTime() < RECHECK_WINDOW_MS
    ) {
      return { ok: true, insight: toInsight(recheck, templateText) };
    }

    let lock: unknown;
    try {
      lock = await BudgetInsight.findOneAndUpdate(
        {
          userId,
          month: monthInput,
          kind: "summary",
          $or: [
            { lastAiAttemptAt: { $exists: false } },
            {
              lastAiAttemptAt: {
                $lt: new Date(now.getTime() - RECHECK_WINDOW_MS),
              },
            },
          ],
        },
        {
          $set: { lastAiAttemptAt: now },
          $setOnInsert: {
            source: "template",
            text: templateText,
            inputFingerprint: fingerprint,
            generatedAt: now,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      lock = null;
    }

    if (lock === null) {
      return {
        ok: true,
        insight: cached
          ? toInsight(cached, templateText)
          : {
              text: templateText,
              source: "template",
              generatedAt: now.toISOString(),
            },
      };
    }

    let text = templateText;
    let source: "ai" | "template" = "template";

    try {
      const { output } = await generateText({
        model: getExpenseModel(),
        output: Output.object({
          schema: aiMonthlySummarySchema,
          name: "MonthlySummary",
        }),
        instructions: buildMonthlySummaryInstructions(),
        prompt: JSON.stringify(data),
        abortSignal: AbortSignal.timeout(15_000),
      });

      const validation = validateMonthlySummaryOutput(output.summary, data);

      if (validation.ok) {
        text = validation.text;
        source = "ai";
      } else {
        console.warn(
          "refreshMonthlySummary invalid output:",
          validation.reason,
        );
      }
    } catch (error: unknown) {
      if (NoObjectGeneratedError.isInstance(error)) {
        console.warn("refreshMonthlySummary: no object generated");
      } else if (APICallError.isInstance(error)) {
        console.error(
          "refreshMonthlySummary APICallError:",
          error.statusCode,
        );
      } else if (
        error instanceof Error &&
        error.name === "TimeoutError"
      ) {
        console.warn("refreshMonthlySummary: timeout");
      } else {
        console.error(
          "refreshMonthlySummary AI call failed:",
          error instanceof Error ? error.name : error,
        );
      }
    }

    await upsertInsight({
      userId,
      month: monthInput,
      kind: "summary",
      text,
      source,
      inputFingerprint: fingerprint,
      now,
    });

    return {
      ok: true,
      insight: { text, source, generatedAt: now.toISOString() },
    };
  } catch (error: unknown) {
    console.error(
      "refreshMonthlySummary failed:",
      error instanceof Error ? error.name : error,
    );

    return {
      ok: false,
      message: "Le résumé mensuel est momentanément indisponible.",
    };
  }
}

export async function refreshPredictiveAlerts(
  monthInput: string,
): Promise<PredictiveAlertsActionState> {
  if (typeof monthInput !== "string" || !MONTH_PATTERN.test(monthInput)) {
    return { ok: false, message: "Mois invalide." };
  }

  const userId = await getUserId();
  const now = new Date();

  try {
    await connectDB();

    const filter = {
      userId,
      month: monthInput,
      kind: "alerts",
    } as const;

    const emptyInsight: PredictiveAlertsInsight = {
      alerts: [],
      source: "template",
      generatedAt: now.toISOString(),
    };

    const clearStaleCache = async (): Promise<void> => {
      await BudgetInsight.findOneAndDelete(filter);
    };

    if (monthInput !== currentMonthTunis(now)) {
      if (
        (await BudgetInsight.findOne(filter).lean<LeanBudgetInsightDoc>()) !==
        null
      ) {
        await clearStaleCache();
      }

      return { ok: true, insight: emptyInsight };
    }

    const [summary, expenses] = await Promise.all([
      getMonthSummary(userId, monthInput),
      listExpenses(userId, { month: monthInput }),
    ]);

    const categoryLimits = summary.budget?.categoryLimits ?? {};

    if (Object.keys(categoryLimits).length === 0) {
      if (
        (await BudgetInsight.findOne(filter).lean<LeanBudgetInsightDoc>()) !==
        null
      ) {
        await clearStaleCache();
      }

      return { ok: true, insight: emptyInsight };
    }

    const fingerprint = buildInsightFingerprint(
      toInsightFingerprintInput({ current: summary, expenses }),
    );

    const projections = buildCategoryProjections({
      totalsByCategory: summary.totalsByCategory,
      expenses,
      categoryLimits,
      dayOfMonth: dayOfMonthTunis(now),
      daysOfTheMonth: daysInMonth(monthInput),
    });

    const templateViews: PredictiveAlertView[] = projections.alerts.map(
      (alert) => ({
        key: alert.key,
        label: alert.label,
        level: alert.level,
        crossingDay: alert.crossingDay,
        text: buildTemplateAlertText(alert),
      }),
    );

    const toStoredAlerts = (
      views: PredictiveAlertView[],
    ): StoredInsightAlert[] =>
      views.map((view) => ({
        categoryKey: view.key,
        level: view.level,
        ...(view.crossingDay !== null ? { crossingDay: view.crossingDay } : {}),
        text: view.text,
      }));

    if (projections.alerts.length === 0) {
      if (
        (await BudgetInsight.findOne(filter).lean<LeanBudgetInsightDoc>()) !==
        null
      ) {
        await clearStaleCache();
      }

      return { ok: true, insight: emptyInsight };
    }

    const cached =
      await BudgetInsight.findOne(filter).lean<LeanBudgetInsightDoc>();

    if (cached) {
      const cachedInsight = toAlertsInsight(cached);

      if (cached.inputFingerprint === fingerprint) {
        const templateRetryNotDue =
          cached.source === "template" &&
          now.getTime() - lastAttemptAt(cached).getTime() <
            TEMPLATE_RETRY_DELAY_MS;

        if (cached.source === "ai" || templateRetryNotDue) {
          return { ok: true, insight: cachedInsight };
        }
      } else if (
        now.getTime() - lastAttemptAt(cached).getTime() < AI_CALL_COOLDOWN_MS
      ) {
        return { ok: true, insight: cachedInsight };
      }
    }

    if (
      !checkRateLimit(`ai-alerts:${userId}`, { limit: 5, windowMs: 60_000 })
    ) {
      return {
        ok: true,
        insight: cached
          ? toAlertsInsight(cached)
          : { ...emptyInsight, alerts: templateViews },
      };
    }

    const recheck =
      await BudgetInsight.findOne(filter).lean<LeanBudgetInsightDoc>();

    if (
      recheck !== null &&
      recheck.inputFingerprint === fingerprint &&
      now.getTime() - lastAttemptAt(recheck).getTime() < RECHECK_WINDOW_MS
    ) {
      return { ok: true, insight: toAlertsInsight(recheck) };
    }

    let lock: unknown;
    try {
      lock = await BudgetInsight.findOneAndUpdate(
        {
          userId,
          month: monthInput,
          kind: "alerts",
          $or: [
            { lastAiAttemptAt: { $exists: false } },
            {
              lastAiAttemptAt: {
                $lt: new Date(now.getTime() - RECHECK_WINDOW_MS),
              },
            },
          ],
        },
        {
          $set: { lastAiAttemptAt: now },
          $setOnInsert: {
            source: "template",
            alerts: toStoredAlerts(templateViews),
            inputFingerprint: fingerprint,
            generatedAt: now,
          },
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
          setDefaultsOnInsert: true,
        },
      );
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      lock = null;
    }

    if (lock === null) {
      return {
        ok: true,
        insight: cached
          ? toAlertsInsight(cached)
          : { ...emptyInsight, alerts: templateViews },
      };
    }

    let views = templateViews;
    let source: InsightSource = "template";

    try {
      const { output } = await generateText({
        model: getExpenseModel(),
        output: Output.object({
          schema: aiPredictiveAlertsSchema,
          name: "PredictiveAlerts",
        }),
        instructions: buildPredictiveAlertsInstructions(),
        prompt: JSON.stringify(projections),
        abortSignal: AbortSignal.timeout(15_000),
      });

      const validation = validatePredictiveAlertsOutput(
        output.alerts,
        projections.alerts,
      );

      if (validation.ok) {
        views = projections.alerts.map((alert) => ({
          key: alert.key,
          label: alert.label,
          level: alert.level,
          crossingDay: alert.crossingDay,
          text: validation.texts[alert.key] ?? buildTemplateAlertText(alert),
        }));
        source = "ai";
      } else {
        console.warn(
          "refreshPredictiveAlerts invalid output:",
          validation.reason,
        );
      }
    } catch (error: unknown) {
      if (NoObjectGeneratedError.isInstance(error)) {
        console.warn("refreshPredictiveAlerts: no object generated");
      } else if (APICallError.isInstance(error)) {
        console.error(
          "refreshPredictiveAlerts APICallError:",
          error.statusCode,
        );
      } else if (
        error instanceof Error &&
        error.name === "TimeoutError"
      ) {
        console.warn("refreshPredictiveAlerts: timeout");
      } else {
        console.error(
          "refreshPredictiveAlerts AI call failed:",
          error instanceof Error ? error.name : error,
        );
      }
    }

    const storedAlerts = toStoredAlerts(views);

    await upsertInsight({
      userId,
      month: monthInput,
      kind: "alerts",
      source,
      inputFingerprint: fingerprint,
      now,
      alerts: storedAlerts,
    });

    return {
      ok: true,
      insight: {
        alerts: views,
        source,
        generatedAt: now.toISOString(),
      },
    };
  } catch (error: unknown) {
    console.error(
      "refreshPredictiveAlerts failed:",
      error instanceof Error ? error.name : error,
    );

    return {
      ok: false,
      message: "Les alertes prédictives sont momentanément indisponibles.",
    };
  }
}
