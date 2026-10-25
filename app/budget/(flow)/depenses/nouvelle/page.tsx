import type { Metadata } from "next";
import ScreenHeader from "@/app/budget/_components/ScreenHeader";
import ExpenseForm from "@/app/budget/_components/ExpenseForm";

export const metadata: Metadata = {
  title: "Nouvelle dépense",
};

export default function NewExpensePage() {
  return (
    <div className="md:mx-auto md:w-full md:max-w-[560px]">
      <ScreenHeader
        title="Nouvelle dépense"
        backHref="/budget/depenses"
        backLabel="Retour aux dépenses"
      />
      <div className="px-4 pb-8 pt-2">
        <ExpenseForm mode="create" />
      </div>
    </div>
  );
}
