"use client";

import { useActionState, useState } from "react";
import { signUp, type SignUpState } from "@/app/actions/auth";

const initialState: SignUpState = {
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

export default function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"TENANT" | "OWNER" | "TECHNICIAN">("TENANT");

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <label className={labelClass}>
          Votre rôle sur HomeCheck
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          <label
            onClick={() => setSelectedRole("TENANT")}
            className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center cursor-pointer transition-all ${
              selectedRole === "TENANT"
                ? "border-zinc-950 bg-zinc-950 text-white shadow-xs dark:border-white dark:bg-white dark:text-zinc-950"
                : "border-zinc-200 bg-white/60 text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#151518]/60 dark:text-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              name="role"
              value="TENANT"
              checked={selectedRole === "TENANT"}
              onChange={() => setSelectedRole("TENANT")}
              className="sr-only"
            />
            <span className="text-xs font-bold">Locataire</span>
            <span className="mt-0.5 text-[10px] opacity-75">Recherche & location</span>
          </label>

          <label
            onClick={() => setSelectedRole("OWNER")}
            className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center cursor-pointer transition-all ${
              selectedRole === "OWNER"
                ? "border-zinc-950 bg-zinc-950 text-white shadow-xs dark:border-white dark:bg-white dark:text-zinc-950"
                : "border-zinc-200 bg-white/60 text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#151518]/60 dark:text-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              name="role"
              value="OWNER"
              checked={selectedRole === "OWNER"}
              onChange={() => setSelectedRole("OWNER")}
              className="sr-only"
            />
            <span className="text-xs font-bold">Propriétaire</span>
            <span className="mt-0.5 text-[10px] opacity-75">Gestion & annonces</span>
          </label>

          <label
            onClick={() => setSelectedRole("TECHNICIAN")}
            className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center cursor-pointer transition-all ${
              selectedRole === "TECHNICIAN"
                ? "border-zinc-950 bg-zinc-950 text-white shadow-xs dark:border-white dark:bg-white dark:text-zinc-950"
                : "border-zinc-200 bg-white/60 text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-[#151518]/60 dark:text-zinc-300 dark:hover:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              name="role"
              value="TECHNICIAN"
              checked={selectedRole === "TECHNICIAN"}
              onChange={() => setSelectedRole("TECHNICIAN")}
              className="sr-only"
            />
            <span className="text-xs font-bold">Technicien</span>
            <span className="mt-0.5 text-[10px] opacity-75">Interventions</span>
          </label>
        </div>
      </div>
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
            className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? "Masquer" : "Afficher"}
          </button>
        </div>
        <p id="password-hint" className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          Au moins 8 caractères.
        </p>
        {state.errors?.password?.map((error) => (
          <p id="password-error" key={error} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ))}
      </div>

      <div>
        <label htmlFor="confirmPassword" className={labelClass}>
          Confirmer le mot de passe
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
              ? "rounded-xl border border-emerald-500/20 bg-emerald-50/80 px-4 py-3 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "rounded-xl border border-red-500/20 bg-red-50/80 px-4 py-3 text-xs font-medium text-red-800 dark:bg-red-950/40 dark:text-red-300"
          }
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-zinc-950 px-4 text-sm font-semibold text-white shadow-xs transition-all hover:bg-zinc-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {pending ? "Création du compte…" : "Créer mon compte"}
      </button>
    </form>
  );
}
