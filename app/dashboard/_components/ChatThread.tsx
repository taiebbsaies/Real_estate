"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
  type UIEvent,
} from "react";
import {
  getMessages,
  markConversationRead,
  sendMessage,
} from "@/app/actions/messages";
import { areSameLocalDay, formatMessageDay } from "@/lib/messages/format";
import type { ChatMessage } from "@/lib/messages/types";
import ReplySuggestions from "@/app/dashboard/_components/ReplySuggestions";

interface ChatThreadProps {
  conversationId: string;
  currentRole: "TENANT" | "OWNER";
  propertyId: string;
  propertyTitle: string;
  propertyCity: string;
  propertyTypeLabel: string | null;
  propertyCoverImage: string | null;
  isListingDeleted: boolean;
  counterpartName: string;
}

type ThreadMessage = ChatMessage & {
  deliveryStatus?: "sending" | "failed";
  failureMessage?: string;
};

const POLL_INTERVAL_MS = 4_000;
const MAX_POLL_FAILURES = 3;
const BACKOFF_AFTER_FAILURES_MS = 15_000;

function messageTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatThread({
  conversationId,
  currentRole,
  propertyId,
  propertyTitle,
  propertyCity,
  propertyTypeLabel,
  propertyCoverImage,
  isListingDeleted,
  counterpartName,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [input, setInput] = useState("");
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const [pending, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const lastMessageAtRef = useRef<string | null>(null);
  const stickToBottomRef = useRef(true);
  const optimisticIdRef = useRef(0);

  const mergeMessages = useCallback(
    (previous: ThreadMessage[], incoming: ChatMessage[]): ThreadMessage[] => {
      const byId = new Map(previous.map((message) => [message.id, message]));
      for (const message of incoming) {
        byId.set(message.id, message);
      }

      if (incoming.length > 0) {
        const latestIncoming = incoming.reduce((latest, message) =>
          message.createdAt > latest.createdAt ? message : latest,
        );
        if (
          !lastMessageAtRef.current ||
          latestIncoming.createdAt > lastMessageAtRef.current
        ) {
          lastMessageAtRef.current = latestIncoming.createdAt;
        }
      }

      return [...byId.values()].sort((first, second) =>
        first.createdAt.localeCompare(second.createdAt),
      );
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let backoffMs = POLL_INTERVAL_MS;
    let failures = 0;

    const run = async () => {
      if (cancelled) return;
      if (
        typeof document !== "undefined" &&
        document.visibilityState !== "visible"
      ) {
        return;
      }

      try {
        const after = lastMessageAtRef.current ?? undefined;
        const incoming = await getMessages(conversationId, after);
        if (cancelled) return;

        if (
          !stickToBottomRef.current &&
          incoming.some((message) => !message.isMine)
        ) {
          setHasNewMessages(true);
        }
        setMessages((previous) => mergeMessages(previous, incoming));
        failures = 0;
        backoffMs = POLL_INTERVAL_MS;
      } catch {
        failures += 1;
        if (failures >= MAX_POLL_FAILURES) {
          backoffMs = BACKOFF_AFTER_FAILURES_MS;
        }
      } finally {
        if (!cancelled && document.visibilityState === "visible") {
          timer = setTimeout(() => {
            void run();
          }, backoffMs);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (timer) clearTimeout(timer);
        void run();
      } else if (timer) {
        clearTimeout(timer);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void run();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [conversationId, mergeMessages]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && !lastMessage.isMine) {
      void markConversationRead(conversationId);
    }
  }, [messages, conversationId]);

  useEffect(() => {
    if (stickToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const maximumHeight = 144;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maximumHeight)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > maximumHeight ? "auto" : "hidden";
  }, [input]);

  const sendOptimisticMessage = useCallback(
    (optimistic: ThreadMessage) => {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === optimistic.id
            ? {
                ...message,
                deliveryStatus: "sending",
                failureMessage: undefined,
              }
            : message,
        ),
      );

      startTransition(async () => {
        try {
          const result = await sendMessage(conversationId, optimistic.body);
          if (!result.success || !result.messageId || !result.createdAt) {
            setMessages((previous) =>
              previous.map((message) =>
                message.id === optimistic.id
                  ? {
                      ...message,
                      deliveryStatus: "failed",
                      failureMessage: result.message,
                    }
                  : message,
              ),
            );
            return;
          }

          const confirmed: ThreadMessage = {
            ...optimistic,
            id: result.messageId,
            createdAt: result.createdAt,
            deliveryStatus: undefined,
            failureMessage: undefined,
          };
          if (
            !lastMessageAtRef.current ||
            confirmed.createdAt > lastMessageAtRef.current
          ) {
            lastMessageAtRef.current = confirmed.createdAt;
          }
          setMessages((previous) => {
            const withoutOptimistic = previous.filter(
              (message) => message.id !== optimistic.id,
            );
            const existing = withoutOptimistic.find(
              (message) => message.id === confirmed.id,
            );
            if (existing) {
              return withoutOptimistic.map((message) =>
                message.id === confirmed.id ? confirmed : message,
              );
            }
            return [...withoutOptimistic, confirmed].sort((first, second) =>
              first.createdAt.localeCompare(second.createdAt),
            );
          });
        } catch (error: unknown) {
          console.error(
            "[ChatThread] send action failed:",
            error instanceof Error ? error.name : "UnknownError",
          );
          setMessages((previous) =>
            previous.map((message) =>
              message.id === optimistic.id
                ? {
                    ...message,
                    deliveryStatus: "failed",
                    failureMessage:
                      "Impossible d’envoyer le message. Réessayez.",
                  }
                : message,
            ),
          );
        }
      });
    },
    [conversationId, startTransition],
  );

  const handleSend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = input.trim();
    if (
      !body ||
      input.length > 1000 ||
      pending ||
      isListingDeleted
    ) {
      return;
    }

    optimisticIdRef.current += 1;
    const optimistic: ThreadMessage = {
      id: `temp-${Date.now()}-${optimisticIdRef.current}`,
      senderRole: currentRole,
      body,
      createdAt: new Date().toISOString(),
      isMine: true,
      deliveryStatus: "sending",
    };
    setMessages((previous) => [...previous, optimistic]);
    setInput("");
    sendOptimisticMessage(optimistic);
  };

  const handleComposerKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const isNearBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight < 80;
    stickToBottomRef.current = isNearBottom;
    if (isNearBottom) setHasNewMessages(false);
  };

  const scrollToLatest = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
    stickToBottomRef.current = true;
    setHasNewMessages(false);
  };

  const listingHref =
    currentRole === "TENANT"
      ? `/dashboard/tenant/properties/${propertyId}`
      : "/dashboard/owner/properties";
  const messagesHref =
    currentRole === "TENANT"
      ? "/dashboard/tenant/messages"
      : "/dashboard/owner/messages";
  const messageIsInvalid = input.trim().length === 0 || input.length > 1000;

  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col overflow-hidden bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 sm:rounded-2xl sm:border sm:border-zinc-200 sm:shadow-sm dark:sm:border-zinc-800">
      <header className="sticky top-0 z-10 shrink-0 border-b border-zinc-200 bg-white/95 px-3 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={messagesHref}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:outline-emerald-300"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
              <path d="M20 12H9" />
            </svg>
            Retour
          </Link>

          {propertyCoverImage ? (
            <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
              <Image
                src={propertyCoverImage}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
            </div>
          ) : (
            <div
              className="flex h-12 w-16 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              aria-hidden="true"
            >
              <svg
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m3 10 9-7 9 7" />
                <path d="M5 9v12h14V9M9 21v-6h6v6" />
              </svg>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{propertyTitle}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{propertyCity}</span>
              {propertyTypeLabel && (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {propertyTypeLabel}
                </span>
              )}
              <span aria-hidden="true">·</span>
              <span className="truncate">{counterpartName}</span>
            </div>
          </div>

          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
            {!isListingDeleted && (
              <Link
                href={listingHref}
                className="inline-flex min-h-9 items-center rounded-xl px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/50 dark:focus-visible:outline-emerald-300"
              >
                Voir l’annonce
              </Link>
            )}
            <Link
              href={messagesHref}
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-red-200 bg-white px-3 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:border-red-900/70 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/40 dark:focus-visible:outline-red-400"
            >
              Quitter la discussion
            </Link>
          </div>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          role="log"
          aria-label="Messages de la conversation"
          aria-live="polite"
          aria-relevant="additions text"
          onScroll={handleScroll}
          className="h-full overflow-y-auto px-3 py-4 sm:px-5"
        >
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Aucun message pour le moment.
            </p>
          ) : (
            <div className="space-y-1">
              {messages.map((message, index) => {
              const previous = messages[index - 1];
              const next = messages[index + 1];
              const startsGroup =
                !previous ||
                previous.senderRole !== message.senderRole ||
                !areSameLocalDay(previous.createdAt, message.createdAt);
              const endsGroup =
                !next ||
                next.senderRole !== message.senderRole ||
                !areSameLocalDay(next.createdAt, message.createdAt);
              const startsNewDay =
                !previous ||
                !areSameLocalDay(previous.createdAt, message.createdAt);
              const isMine = message.isMine;

                return (
                  <div key={message.id}>
                  {startsNewDay && (
                    <div
                      role="separator"
                      className="my-5 flex items-center gap-3 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500"
                    >
                      <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                      <span>{formatMessageDay(message.createdAt)}</span>
                      <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                  )}

                  <div
                    className={`flex items-end gap-2 ${
                      isMine ? "justify-end" : "justify-start"
                    } ${endsGroup ? "mb-3" : "mb-0.5"}`}
                  >
                    {!isMine &&
                      (startsGroup ? (
                        <span
                          aria-hidden="true"
                          className="mb-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        >
                          {counterpartName.charAt(0).toLocaleUpperCase("fr-FR") ||
                            "?"}
                        </span>
                      ) : (
                        <span className="w-7 shrink-0" aria-hidden="true" />
                      ))}

                    <div
                      className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-sm sm:max-w-[75%] ${
                        isMine
                          ? `bg-[#166534] text-white dark:bg-emerald-700 ${
                              startsGroup ? "rounded-tr-md" : ""
                            } ${endsGroup ? "rounded-br-md" : ""}`
                          : `bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 ${
                              startsGroup ? "rounded-tl-md" : ""
                            } ${endsGroup ? "rounded-bl-md" : ""}`
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {message.body}
                      </p>
                      <div className="mt-1 flex items-center justify-end gap-2">
                        <time
                          dateTime={message.createdAt}
                          className={`text-[10px] ${
                            isMine
                              ? "text-emerald-100 dark:text-emerald-200"
                              : "text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          {messageTime(message.createdAt)}
                        </time>
                        {message.deliveryStatus === "sending" && (
                          <span className="text-[10px] text-emerald-100 dark:text-emerald-200">
                            Envoi…
                          </span>
                        )}
                        {message.deliveryStatus === "failed" && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-red-100">
                            <span>Échec,</span>
                            <button
                              type="button"
                              onClick={() => sendOptimisticMessage(message)}
                              disabled={pending || isListingDeleted}
                              aria-label="Échec, réessayer l’envoi du message"
                              className="rounded px-1 font-bold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-60"
                            >
                              réessayer
                            </button>
                          </span>
                        )}
                      </div>
                      {message.deliveryStatus === "failed" &&
                        message.failureMessage && (
                          <p className="mt-1 text-right text-[10px] text-red-100">
                            {message.failureMessage}
                          </p>
                        )}
                    </div>
                  </div>
                  </div>
                );
              })}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {hasNewMessages && (
          <button
            type="button"
            onClick={scrollToLatest}
            className="absolute bottom-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
          >
            Nouveaux messages
            <span aria-hidden="true">↓</span>
          </button>
        )}
      </div>

      <footer className="sticky bottom-0 z-10 shrink-0 border-t border-zinc-200 bg-white/95 px-3 py-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95 sm:px-5">
        {isListingDeleted && (
          <p
            role="status"
            className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200"
          >
            Cette annonce a été supprimée. La conversation est désormais en
            lecture seule.
          </p>
        )}

        {currentRole === "OWNER" && !isListingDeleted && (
          <ReplySuggestions
            conversationId={conversationId}
            lastMessageId={messages[messages.length - 1]?.id ?? null}
            lastMessageIsMine={messages[messages.length - 1]?.isMine ?? false}
            onSelect={(text) => {
              setInput(text);
              textareaRef.current?.focus();
            }}
          />
        )}

        <form onSubmit={handleSend} className="flex items-end gap-2">
          <label className="sr-only" htmlFor={`message-${conversationId}`}>
            Votre message
          </label>
          <textarea
            ref={textareaRef}
            id={`message-${conversationId}`}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder={
              isListingDeleted
                ? "Conversation en lecture seule"
                : "Écrivez votre message…"
            }
            rows={1}
            maxLength={1000}
            disabled={isListingDeleted}
            className="max-h-36 min-h-11 flex-1 resize-none rounded-2xl border border-zinc-200 bg-white px-3.5 py-3 text-sm text-zinc-900 outline-none transition focus-visible:border-emerald-600 focus-visible:ring-2 focus-visible:ring-emerald-600/20 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus-visible:border-emerald-400 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
          />
          <button
            type="submit"
            disabled={
              pending ||
              isListingDeleted ||
              messageIsInvalid
            }
            aria-label="Envoyer le message"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#166534] text-white shadow-sm transition hover:bg-[#14532d] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400 dark:focus-visible:outline-emerald-300"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
          </button>
        </form>

        <div className="mt-1 flex min-h-4 items-center justify-between gap-3">
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            {isListingDeleted ? "" : "Entrée pour envoyer · Maj+Entrée pour une ligne"}
          </p>
          {input.length > 800 && (
            <p
              aria-live="polite"
              className={`text-[10px] ${
                input.length > 1000
                  ? "text-red-600 dark:text-red-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {input.length}/1000
            </p>
          )}
        </div>
      </footer>
    </section>
  );
}
