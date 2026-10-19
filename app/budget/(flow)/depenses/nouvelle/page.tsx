import type { Metadata } from "next";
import ScreenHeader from "@/app/budget/_components/ScreenHeader";
import ExpenseForm from "@/app/budget/_components/ExpenseForm";

export const metadata: Metadata = {
  title: "Nouvelle dépense — HomeCheck",
};

export default function NewExpensePage() {
  return (
    <>
      <ScreenHeader
        title="Nouvelle dépense"
        backHref="/budget/depenses"
        backLabel="Retour aux dépenses"
      />
      <div className="px-4 pb-8 pt-2">
        <ExpenseForm mode="create" />
      </div>
    </>
  );
}
