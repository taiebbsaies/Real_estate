import "server-only";
import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import Budget from "@/models/budget";
import Expense from "@/models/expense";
import type { BudgetCategory } from "@/lib/constants/budget";
import {
  alertLevel,
  currentMonth,
  monthBounds,
  percentUsed,
  remaining,
  shareByCategory,
  type AlertLevel,
} from "@/lib/budget/calculations";

type LeanBudgetDoc = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  month: string;
  limit: number;
  income?: number;
  createdAt: Date;
  updatedAt: Date;
};

type LeanExpenseDoc = {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  amount: number;
  date: Date;
  category: BudgetCategory;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SerializedBudget = {
  id: string;
  month: string;
  limit: number;
  income?: number;
  createdAt: string;
  updatedAt: string;
};

export type SerializedExpense = {
  id: string;
  amount: number;
  date: string;
  category: BudgetCategory;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type MonthSummary = {
  budget: SerializedBudget | null;
  spent: number;
  totalsByCategory: Record<string, number>;
  sharesByCategory: Record<string, number>;
  remaining: number;
  percentUsed: number;
  alertLevel: AlertLevel;
};

export type HistoryStatus = "respecte" | "depasse";

export type HistoryEntry = {
  month: string;
  limit: number;
  spent: number;
  percentUsed: number;
  status: HistoryStatus;
};

export type ListExpensesOptions = {
  month?: string;
  category?: BudgetCategory;
};

export function budgetCacheTag(userId: string): string {
  return `budget:${userId}`;
}

function serializeBudget(doc: LeanBudgetDoc): SerializedBudget {
  return {
    id: String(doc._id),
    month: doc.month,
    limit: doc.limit,
    ...(doc.income !== undefined ? { income: doc.income } : {}),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function serializeExpense(doc: LeanExpenseDoc): SerializedExpense {
  return {
    id: String(doc._id),
    amount: doc.amount,
    date: doc.date.toISOString(),
    category: doc.category,
    ...(doc.note !== undefined && doc.note !== "" ? { note: doc.note } : {}),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export async function getBudget(
  userId: string,
  month: string,
): Promise<SerializedBudget | null> {
  await connectDB();

  const doc = await Budget.findOne({ userId, month }).lean<LeanBudgetDoc>();

  return doc ? serializeBudget(doc) : null;
}

export async function getPreviousBudget(
  userId: string,
  month: string,
): Promise<SerializedBudget | null> {
  await connectDB();

  const doc = await Budget.findOne({ userId, month: { $lt: month } })
    .sort({ month: -1 })
    .lean<LeanBudgetDoc>();

  return doc ? serializeBudget(doc) : null;
}

export async function getMonthSummary(
  userId: string,
  month: string,
): Promise<MonthSummary> {
  await connectDB();

  const { start, end } = monthBounds(month);

  const [budgetDoc, categoryRows] = await Promise.all([
    Budget.findOne({ userId, month }).lean<LeanBudgetDoc>(),
    Expense.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: "$category", total: { $sum: "$amount" } } },
    ]),
  ]);

  const totalsByCategory = Object.fromEntries(
    categoryRows.map((row) => [row._id, row.total]),
  );

  const spent = categoryRows.reduce((sum, row) => sum + row.total, 0);
  const limit = budgetDoc?.limit ?? 0;
  const percent = percentUsed(limit, spent);

  return {
    budget: budgetDoc ? serializeBudget(budgetDoc) : null,
    spent,
    totalsByCategory,
    sharesByCategory: shareByCategory(totalsByCategory),
    remaining: remaining(limit, spent),
    percentUsed: percent,
    alertLevel: alertLevel(percent),
  };
}

export async function listExpenses(
  userId: string,
  options: ListExpensesOptions = {},
): Promise<SerializedExpense[]> {
  await connectDB();

  const filter: Record<string, unknown> = { userId };

  if (options.month) {
    const { start, end } = monthBounds(options.month);
    filter.date = { $gte: start, $lt: end };
  }

  if (options.category) {
    filter.category = options.category;
  }

  const docs = await Expense.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .lean<LeanExpenseDoc[]>();

  return docs.map(serializeExpense);
}

export async function getHistory(
  userId: string,
  monthsCount = 6,
): Promise<HistoryEntry[]> {
  await connectDB();

  const now = new Date();
  const months: string[] = [];

  for (let index = 0; index < monthsCount; index++) {
    const cursor = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1),
    );
    months.push(currentMonth(cursor));
  }

  const oldest = months[months.length - 1];
  const newest = months[0];
  const { start } = monthBounds(oldest);
  const { end } = monthBounds(newest);

  const [budgetDocs, totalRows] = await Promise.all([
    Budget.find({ userId, month: { $gte: oldest, $lte: newest } }).lean<
      LeanBudgetDoc[]
    >(),
    Expense.aggregate<{ _id: string; total: number }>([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$date" } },
          total: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  const budgetByMonth = new Map(budgetDocs.map((doc) => [doc.month, doc]));
  const spentByMonth = new Map(totalRows.map((row) => [row._id, row.total]));
  const entries: HistoryEntry[] = [];

  for (const month of months) {
    const budget = budgetByMonth.get(month);

    if (!budget) {
      continue;
    }

    const spent = spentByMonth.get(month) ?? 0;

    entries.push({
      month,
      limit: budget.limit,
      spent,
      percentUsed: percentUsed(budget.limit, spent),
      status: spent > budget.limit ? "depasse" : "respecte",
    });
  }

  return entries;
}
