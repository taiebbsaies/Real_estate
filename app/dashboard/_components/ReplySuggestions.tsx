"use client";

import { useEffect, useRef, useState } from "react";
import { suggestReplies } from "@/app/actions/message-suggestions";

interface ReplySuggestionsProps {
  conversationId: string;
  lastMessageId: string | null;
  lastMessageIsMine: boolean;
  disabled?: boolean;
  onSelect: (text: string) => void;
}

export default function ReplySuggestions({
  conversationId,
  lastMessageId,
  lastMessageIsMine,
  disabled = false,
  onSelect,
}: ReplySuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const requestedRef = useRef<string | null>(null);

  useEffect(() => {
    if (disabled || lastMessageIsMine || !lastMessageId) {
      return;
    }
    if (requestedRef.current === lastMessageId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setSuggestions([]);
      setError(null);
      setPending(true);
      try {
        const result = await suggestReplies({ conversationId });
        if (cancelled) return;
        if (result.ok) {
          requestedRef.current = lastMessageId;
          setSuggestions(result.suggestions.slice(0, 3));
        } else {
          setSuggestions([]);
          setError(result.message ?? "Suggestions indisponibles.");
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setError("Suggestions indisponibles.");
        }
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [conversationId, lastMessageId, lastMessageIsMine, disabled]);

  const visible =
    !disabled && !lastMessageIsMine ? suggestions.slice(0, 3) : [];

  if (disabled || lastMessageIsMine) {
    return null;
  }

  if (pending && visible.length === 0) {
    return (
      <p className="mb-2 text-[11px] text-zinc-500 dark:text-zinc-400">
        Suggestions de réponse…
      </p>
    );
  }

  if (error && visible.length === 0) {
    return (
      <p className="mb-2 text-[11px] text-zinc-500 dark:text-zinc-400">
        {error}
      </p>
    );
  }

  if (visible.length === 0) {
    return null;
  }

  return (
    <div
      className="mb-2 flex flex-wrap items-center gap-2"
      aria-label="Suggestions de réponse"
    >
      <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
        Suggestions :
      </span>
      {visible.map((suggestion) => (
        <button
          key={suggestion}
          type="button"
          onClick={() => onSelect(suggestion)}
          title={suggestion}
          className="max-w-full truncate rounded-full border border-zinc-200 bg-white px-3 py-1 text-left text-[11px] font-medium text-zinc-700 transition hover:border-emerald-600 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-emerald-400 dark:hover:text-emerald-300 sm:max-w-[22rem]"
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
