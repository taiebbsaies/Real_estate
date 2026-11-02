"use client";

import { useState, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/favorites";

interface FavoriteButtonProps {
  propertyId: string;
  initialIsFavorite: boolean;
  className?: string;
}

export default function FavoriteButton({
  propertyId,
  initialIsFavorite,
  className = "",
}: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [pending, startTransition] = useTransition();
  const label = isFavorite
    ? "Retirer des favoris"
    : "Ajouter aux favoris";

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (pending) return;

    const previousIsFavorite = isFavorite;
    const nextIsFavorite = !previousIsFavorite;
    const formData = new FormData();
    formData.set("propertyId", propertyId);
    setIsFavorite(nextIsFavorite);
    setMessage("");
    setIsError(false);

    startTransition(async () => {
      try {
        const result = await toggleFavorite(
          { success: true, message: "", isFavorite: previousIsFavorite },
          formData,
        );
        setIsFavorite(result.isFavorite);
        setMessage(result.message);
        setIsError(!result.success);
      } catch (error: unknown) {
        console.error("[FavoriteButton] toggle action failed:", error);
        setIsFavorite(previousIsFavorite);
        setMessage("Impossible de modifier vos favoris. Veuillez réessayer.");
        setIsError(true);
      }
    });
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={label}
        aria-pressed={isFavorite}
        title={label}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white/95 text-zinc-600 shadow-sm transition hover:scale-105 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-300 dark:hover:text-rose-400"
      >
        <svg
          aria-hidden="true"
          className={`h-5 w-5 ${isFavorite ? "fill-rose-500 text-rose-500 dark:fill-rose-400 dark:text-rose-400" : "fill-none"}`}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
        </svg>
      </button>
      {message && isError && (
        <p
          role="alert"
          className="mt-1 max-w-48 text-right text-xs text-red-600 dark:text-red-400"
        >
          {message}
        </p>
      )}
      {message && !isError && (
        <p className="sr-only" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
