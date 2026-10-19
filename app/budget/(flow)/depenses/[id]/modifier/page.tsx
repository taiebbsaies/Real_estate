import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isValidObjectId } from "mongoose";
import { getUserId } from "@/lib/budget/current-user";
import { millimesToTnd } from "@/lib/budget/calculations";
import { getExpense } from "@/lib/budget/queries";
import ScreenHeader from "@/app/budget/_components/ScreenHeader";
import ExpenseForm from "@/app/budget/_components/ExpenseForm";

export const metadata: Metadata = {
  title: "Modifier la dépense — HomeCheck",
};

type Params = Promise<{ id: string }>;

function EditSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6" aria-hidden="true">
      <div className="h-8 w-56 animate-pulse rounded bg-[var(--budget-skeleton)]" />
      <div className="h-96 animate-pulse rounded-[16px] bg-[var(--budget-skeleton)]" />
    </div>
  );
}

async function EditExpenseContent({ params }: { params: Params }) {
  const { id } = await params;

  if (!isValidObjectId(id)) {
    notFound();
  }

  const userId = await getUserId();
  const expense = await getExpense(userId, id);

  if (!expense) {
    notFound();
  }

  return (
    <>
      <ScreenHeader
        title="Modifier la dépense"
        backHref="/budget/depenses"
        backLabel="Retour aux dépenses"
      />
      <div className="px-4 pb-8 pt-2">
        <ExpenseForm
          mode="edit"
          expense={{
            id: expense.id,
            amount: millimesToTnd(expense.amount),
            date: expense.date.slice(0, 10),
            category: expense.category,
            note: expense.note ?? "",
          }}
        />
      </div>
    </>
  );
}

export default async function EditExpensePage({
  params,
}: PageProps<"/budget/depenses/[id]/modifier">) {
  return (
    <Suspense fallback={<EditSkeleton />}>
      <EditExpenseContent params={params} />
    </Suspense>
  );
}
