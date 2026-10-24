"use client";

import { useActionState, useState } from "react";
import { signUp, type SignUpState } from "@/app/actions/auth";

const initialState: SignUpState = {
  success: false,
  message: "",
};

function fieldClass(hasError: boolean) {
  const base =
    "block w-full rounded-lg border bg-white px-3 py-2.5 text-zinc-900 shadow-sm transition-colors placeholder:text-zinc-400 focus:outline-none focus:ring-2 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-500";
  if (hasError) {
    return `${base} border-red-500 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500`;
  }
  return `${base} border-zinc-300 focus:border-blue-600 focus:ring-blue-600/20 dark:border-zinc-700 dark:focus:border-blue-500`;
}

const labelClass =
  "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

export default function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelClass}>
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            required
            minLength={2}
            maxLength={80}
            aria-invalid={!!state.errors?.firstName}
            aria-describedby={
              state.errors?.firstName ? "firstName-error" : undefined
            }
            className={fieldClass(!!state.errors?.firstName)}
          />
          {state.errors?.firstName?.map((error) => (
            <p id="firstName-error" key={error} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ))}
        </div>

        <div>
          <label htmlFor="lastName" className={labelClass}>
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            required
            minLength={2}
            maxLength={80}
            aria-invalid={!!state.errors?.lastName}
            aria-describedby={
              state.errors?.lastName ? "lastName-error" : undefined
            }
            className={fieldClass(!!state.errors?.lastName)}
          />
          {state.errors?.lastName?.map((error) => (
            <p id="lastName-error" key={error} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="email" className={labelClass}>
          Email
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
        />
        {state.errors?.email?.map((error) => (
          <p id="email-error" key={error} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ))}
      </div>

      <div>
        <label htmlFor="role" className={labelClass}>
          Account type / Role
        </label>
        <select
          id="role"
          name="role"
          defaultValue="TENANT"
          className="block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 shadow-sm transition-colors focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-blue-500"
        >
          <option value="TENANT">Locataire (Tenant)</option>
          <option value="OWNER">Propriétaire (Owner)</option>
          <option value="TECHNICIAN">Technicien (Technician)</option>
        </select>
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            aria-invalid={!!state.errors?.password}
            aria-describedby="password-hint password-error"
            className={`${fieldClass(!!state.errors?.password)} pr-10`}
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
        <p id="password-hint" className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          At least 8 characters.
        </p>
        {state.errors?.password?.map((error) => (
          <p id="password-error" key={error} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ))}
      </div>

      <div>
        <label htmlFor="confirmPassword" className={labelClass}>
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          aria-invalid={!!state.errors?.confirmPassword}
          aria-describedby={
            state.errors?.confirmPassword ? "confirmPassword-error" : undefined
          }
          className={fieldClass(!!state.errors?.confirmPassword)}
        />
        {state.errors?.confirmPassword?.map((error) => (
          <p
            id="confirmPassword-error"
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
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
