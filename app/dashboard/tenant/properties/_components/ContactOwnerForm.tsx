"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { startConversation } from "@/app/actions/messages";

interface ContactOwnerFormProps {
  propertyId: string;
}

export default function ContactOwnerForm({
  propertyId,
}: ContactOwnerFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const trimmedLength = body.trim().length;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = body.trim();
    if (!value || pending) return;
    setError("");
    startTransition(async () => {
      const result = await startConversation(propertyId, value);
      if (result.success) {
        setBody("");
        router.push(
          result.conversationId
            ? `/dashboard/tenant/messages/${result.conversationId}`
            : "/dashboard/tenant/messages",
        );
        return;
      }
      setError(result.message);
    });
  }

  const inputClass =
    "w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label htmlFor={`contact-message-${propertyId}`} className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
        Votre message
      </label>
      <textarea
        id={`contact-message-${propertyId}`}
        name="body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        required
        minLength={1}
        maxLength={1000}
        rows={3}
        placeholder="Écrivez votre message au propriétaire…"
        className={`${inputClass} resize-y`}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-zinc-400">
          {trimmedLength}/1000 caractères
        </p>
        <button
          type="submit"
          disabled={pending || trimmedLength === 0}
          className="inline-flex h-10 items-center justify-center rounded-xl bg-[#166534] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#14532d] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-emerald-600 dark:hover:bg-emerald-500"
        >
          {pending ? "Envoi…" : "Envoyer"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  );
}
