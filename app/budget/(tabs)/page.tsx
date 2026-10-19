export default function BudgetHomePage() {
  return (
    <main className="flex flex-col gap-2 px-4 pt-6">
      <h1 className="budget-heading text-[28px] font-semibold tracking-tight text-[var(--budget-secondary)]">
        Budget
      </h1>
      <p className="text-[14px] text-[var(--budget-muted)]">À venir</p>
    </main>
  );
}
