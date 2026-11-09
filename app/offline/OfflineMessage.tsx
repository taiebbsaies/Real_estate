import { WifiOffIcon } from "@/app/budget/_components/icons";
import RetryButton from "./RetryButton";

export default function OfflineMessage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#DCFCE7] dark:bg-zinc-800">
        <WifiOffIcon className="h-6 w-6 text-[#166534] dark:text-zinc-400" />
      </div>
      <h1 className="text-2xl font-extrabold tracking-tight text-[#1F2937] dark:text-zinc-50">
        Vous êtes hors ligne
      </h1>
      <p className="max-w-[320px] text-sm leading-relaxed text-[#6B7280] dark:text-zinc-400">
        Vérifiez votre connexion internet, puis réessayez. Les pages déjà consultées restent
        accessibles depuis le menu.
      </p>
      <RetryButton />
    </main>
  );
}
