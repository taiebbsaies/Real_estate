"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { usePathname } from "next/navigation";
import {
  MAX_CHAT_HISTORY,
  MAX_CHAT_MESSAGE_LENGTH,
  type ChatMessage,
} from "@/lib/validations/chat";

// proxy.ts requires a session on these routes, so the root layout can stay
// static instead of reading the session on every page.
const SIGNED_IN_PREFIXES = ["/dashboard", "/profile", "/budget", "/maintenance"];

const GENERIC_ERROR = "L'assistant est indisponible. Veuillez réessayer.";

async function readError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  if (
    typeof body === "object" &&
    body !== null &&
    "message" in body &&
    typeof body.message === "string"
  ) {
    return body.message;
  }
  return GENERIC_ERROR;
}

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, error]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => () => abortRef.current?.abort(), []);

  if (!SIGNED_IN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }

  async function send() {
    const question = input.trim();
    if (!question || pending) return;

    if (!navigator.onLine) {
      setError("Vous êtes hors ligne. Reconnectez-vous pour utiliser l'assistant.");
      return;
    }

    const history: ChatMessage[] = [
      ...messages,
      { role: "user" as const, content: question },
    ].slice(-MAX_CHAT_HISTORY);

    setMessages(history);
    setInput("");
    setError(null);
    setPending(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let answer = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        setError(await readError(response));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        if (answer.trim()) {
          setMessages([...history, { role: "assistant", content: answer }]);
        }
      }

      // Provider errors end the text stream without any content.
      if (!answer.trim()) {
        setError(GENERIC_ERROR);
      }
    } catch {
      if (!controller.signal.aborted) {
        setError(GENERIC_ERROR);
      }
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void send();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  const waitingForFirstWord =
    pending && messages[messages.length - 1]?.role === "user";

  return (
    <div className="print:hidden">
      {open && (
        <section
          aria-label="Assistant HomeCheck"
          className="fixed inset-x-4 bottom-36 z-[60] flex max-h-[min(65vh,32rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl md:inset-x-auto md:bottom-24 md:right-6 md:w-96 dark:border-zinc-800 dark:bg-[#111114]"
        >
          <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-50">
              Assistant HomeCheck
            </h2>
            <button
              type="button"
              aria-label="Fermer l'assistant"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              ✕
            </button>
          </header>

          <div
            ref={scrollRef}
            aria-live="polite"
            className="min-h-40 flex-1 space-y-3 overflow-y-auto px-4 py-3"
          >
            {messages.length === 0 && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Bonjour ! Posez-moi une question sur HomeCheck ou sur la
                location. Je n&apos;ai pas accès aux données de votre compte.
              </p>
            )}

            {messages.map((message, index) => (
              <p
                key={index}
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-[#166534] text-white dark:bg-emerald-500 dark:text-zinc-950"
                    : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
                }`}
              >
                {message.content}
              </p>
            ))}

            {waitingForFirstWord && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400" role="status">
                L&apos;assistant écrit…
              </p>
            )}

            {error && (
              <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex items-end gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
          >
            <textarea
              ref={inputRef}
              aria-label="Votre message"
              rows={1}
              maxLength={MAX_CHAT_MESSAGE_LENGTH}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Votre question…"
              className="max-h-24 min-h-10 flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 outline-none focus:border-zinc-950 md:text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-zinc-400"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className="h-10 rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-950"
            >
              Envoyer
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant"}
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-20 right-4 z-[60] flex h-13 w-13 items-center justify-center rounded-full bg-[#166534] text-white shadow-lg transition hover:bg-[#14532d] md:bottom-6 md:right-6 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
      >
        <svg
          className="h-6 w-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </div>
  );
}
