import type { Metadata } from "next";
import { WifiOffIcon } from "@/app/budget/_components/icons";
import RetryButton from "./RetryButton";

export const metadata: Metadata = {
  title: "Hors ligne",
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <WifiOffIcon className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Vous êtes hors ligne
      </h1>
      <p className="max-w-[320px] text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
        Données indisponibles hors ligne. Vérifiez votre connexion internet,
        puis réessayez.
      </p>
      <RetryButton />
    </main>
  );
}
