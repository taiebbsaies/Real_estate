"use client";

import { useState } from "react";
import { translateDescription } from "@/app/actions/property-translation";

type Language = "fr" | "ar" | "en";

const LANGUAGES: { code: Language; label: string }[] = [
  { code: "fr", label: "FR" },
  { code: "ar", label: "AR" },
  { code: "en", label: "EN" },
];

interface DescriptionTranslationProps {
  propertyId: string;
  description: string;
}

export default function DescriptionTranslation({
  propertyId,
  description,
}: DescriptionTranslationProps) {
  const [language, setLanguage] = useState<Language | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleTranslate = async (targetLang: Language) => {
    if (pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const result = await translateDescription({ propertyId, targetLang });
      if (!result.ok || !result.translation) {
        setTranslation(null);
        setLanguage(null);
        setError(result.message || "Traduction indisponible.");
        return;
      }

      setTranslation(result.translation);
      setLanguage(targetLang);
    } catch {
      setTranslation(null);
      setLanguage(null);
      setError("Traduction indisponible.");
    } finally {
      setPending(false);
    }
  };

  const showOriginal = () => {
    setLanguage(null);
    setTranslation(null);
    setError(null);
  };

  const displayedText =
    language && translation ? translation : description;
  const isRtl = language === "ar";

  return (
    <div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
          Traduire :
        </span>
        {LANGUAGES.map((item) => (
          <button
            key={item.code}
            type="button"
            onClick={() => handleTranslate(item.code)}
            disabled={pending}
            aria-pressed={language === item.code}
            className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              language === item.code
                ? "border-emerald-700 bg-emerald-700 text-white dark:border-emerald-500 dark:bg-emerald-600"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
            }`}
          >
            {item.label}
          </button>
        ))}
        {language && (
          <button
            type="button"
            onClick={showOriginal}
            className="rounded-full px-2 py-1 text-[11px] font-semibold text-zinc-500 underline decoration-zinc-300 underline-offset-2 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Voir l’original
          </button>
        )}
        {pending && (
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Traduction…
          </span>
        )}
      </div>

      <p
        dir={isRtl ? "rtl" : undefined}
        lang={language ?? undefined}
        className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-600 dark:text-zinc-400"
      >
        {displayedText}
      </p>

      {error && (
        <p
          role="status"
          className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-300"
        >
          {error}
        </p>
      )}
    </div>
  );
}
