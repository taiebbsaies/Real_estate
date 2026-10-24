"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, type LoginState } from "@/app/actions/auth";

const initialState: LoginState = {
  success: false,
  message: "",
};

function fieldClass(hasError: boolean) {
  const base =
    "block w-full rounded-xl border bg-white/70 px-3.5 py-2.5 text-sm text-zinc-900 shadow-xs backdrop-blur-xs transition-all placeholder:text-zinc-400 focus:outline-none focus:ring-2 dark:bg-[#151518]/80 dark:text-zinc-100 dark:placeholder:text-zinc-600";
  if (hasError) {
    return `${base} border-red-500/80 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/70`;
  }
  return `${base} border-zinc-200 focus:border-zinc-950 focus:ring-zinc-950/10 dark:border-zinc-800 dark:focus:border-zinc-200 dark:focus:ring-white/10`;
}

const labelClass =
  "mb-1.5 block text-xs font-semibold tracking-wide uppercase text-zinc-600 dark:text-zinc-400";

const roleLabels: Record<string, string> = {
  TENANT: "Locataire",
  OWNER: "Propriétaire",
  TECHNICIAN: "Technicien",
  ADMIN: "Administrateur",
};

export default function LoginForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <label htmlFor="email" className={labelClass}>
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          aria-invalid={!!state.errors?.email}
          aria-describedby={state.errors?.email ? "email-error" : undefined}
          className={fieldClass(!!state.errors?.email)}
          placeholder="you@example.com"
        />
        {state.errors?.email?.map((error) => (
          <p
            id="email-error"
            key={error}
            className="mt-1.5 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={!!state.errors?.password}
            aria-describedby={
              state.errors?.password ? "password-error" : undefined
            }
            className={`${fieldClass(!!state.errors?.password)} pr-10`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {state.errors?.password?.map((error) => (
          <p
            id="password-error"
            key={error}
            className="mt-1.5 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ))}
      </div>

      {state.message && (
        <div
          role="status"
          className={
            state.success
              ? "rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900/50 dark:bg-green-950/40 dark:text-green-300"
              : "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
          }
        >
          <p className="font-medium">{state.message}</p>
          {state.user && (
            <div className="mt-2 text-xs">
              <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-green-800 dark:bg-green-900/60 dark:text-green-200">
                Rôle : {roleLabels[state.user.role] ?? state.user.role}
              </span>
            </div>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-xs transition-all hover:bg-zinc-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {pending ? "Connexion en cours…" : "Se connecter"}
      </button>
    </form>
  );
}
