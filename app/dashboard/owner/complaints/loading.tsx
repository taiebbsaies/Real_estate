export default function OwnerComplaintsLoading() {
  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950" aria-busy="true">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <span className="text-lg font-semibold tracking-tight text-blue-600 dark:text-blue-400">
            HomeCheck
          </span>
          <span className="text-zinc-400">/</span>
          <span className="text-sm text-zinc-500">Propriétaire</span>
          <span className="text-zinc-400">/</span>
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Réclamations
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8" aria-label="Chargement des réclamations">
        <div className="mb-8 space-y-2">
          <div className="h-7 w-72 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-96 max-w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <div className="mb-10 space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="h-5 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
                />
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-72 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-72 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          </div>
          <div className="h-64 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
        </div>

        <div className="space-y-5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
