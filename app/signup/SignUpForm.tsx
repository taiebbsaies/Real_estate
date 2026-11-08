"use client";

import { useActionState, useState, useCallback } from "react";
import { signUp, type SignUpState } from "@/app/actions/auth";
import TechnicianFields from "@/app/_components/TechnicianFields";

const initialState: SignUpState = {
  success: false,
  message: "",
};

/* --- helpers -------------------------------------------------------- */

function fieldClass(hasError: boolean) {
  const base =
    "block w-full rounded-xl border bg-white/90 px-3.5 py-2.5 text-sm text-[#1F2937] shadow-xs backdrop-blur-xs transition-all placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 dark:bg-[#151518]/80 dark:text-zinc-100 dark:placeholder:text-zinc-600";
  if (hasError) {
    return `${base} border-red-500/80 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/70`;
  }
  return `${base} border-[#DCFCE7] focus:border-[#166534] focus:ring-[#166534]/20 dark:border-zinc-800 dark:focus:border-zinc-200 dark:focus:ring-white/10`;
}

const labelClass =
  "mb-1.5 block text-xs font-semibold tracking-wide uppercase text-[#6B7280] dark:text-zinc-400";

/* --- password-strength logic ---------------------------------------- */

const RULES = [
  { id: "length",    label: "Au moins 8 caractères",          test: (v: string) => v.length >= 8 },
  { id: "uppercase", label: "Une lettre majuscule (A-Z)",     test: (v: string) => /[A-Z]/.test(v) },
  { id: "lowercase", label: "Une lettre minuscule (a-z)",     test: (v: string) => /[a-z]/.test(v) },
  { id: "number",    label: "Un chiffre (0-9)",               test: (v: string) => /[0-9]/.test(v) },
  { id: "symbol",    label: "Un caractère spécial (!@#$…)",  test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

type StrengthLevel = 0 | 1 | 2 | 3 | 4;

function getStrength(password: string): { score: StrengthLevel; passed: boolean[] } {
  const passed = RULES.map((r) => r.test(password));
  const score = Math.min(4, passed.filter(Boolean).length) as StrengthLevel;
  return { score, passed };
}

const STRENGTH_META: Record<
  StrengthLevel,
  { label: string; barColor: string; textColor: string }
> = {
  0: { label: "",            barColor: "bg-zinc-200 dark:bg-zinc-700",  textColor: "" },
  1: { label: "Trop faible", barColor: "bg-red-500",                   textColor: "text-red-600 dark:text-red-400" },
  2: { label: "Faible",      barColor: "bg-orange-500",                textColor: "text-orange-600 dark:text-orange-400" },
  3: { label: "Correct",     barColor: "bg-yellow-500",                textColor: "text-yellow-600 dark:text-yellow-400" },
  4: { label: "Solide",      barColor: "bg-emerald-500",               textColor: "text-emerald-600 dark:text-emerald-400" },
};

/* --- PasswordStrengthBar -------------------------------------------- */

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;

  const { score, passed } = getStrength(password);
  const meta = STRENGTH_META[score];

  return (
    <div className="mt-2.5 space-y-2">
      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-label="Sécurité du mot de passe"
      >
        {([1, 2, 3, 4] as const).map((seg) => (
          <div
            key={seg}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ease-out ${
              score >= seg ? meta.barColor : "bg-zinc-200 dark:bg-zinc-700"
            }`}
          />
        ))}
      </div>

      {meta.label && (
        <p className={`text-xs font-semibold ${meta.textColor}`}>{meta.label}</p>
      )}

      {/* fixed-background checklist — never changes color */}
      <ul className="rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2.5 space-y-1.5 text-xs">
        {RULES.map((rule, idx) => (
          <li
            key={rule.id}
            className={`flex items-center gap-2 transition-colors duration-200 ${
              passed[idx]
                ? "text-emerald-700 dark:text-emerald-300"
                : "text-zinc-700 dark:text-zinc-300"
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200 ${
                passed[idx]
                  ? "bg-emerald-500 text-white"
                  : "border border-zinc-400 dark:border-zinc-500"
              }`}
            >
              {passed[idx] ? "\u2713" : ""}
            </span>
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --- email validation ----------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim());
}

/* --- Main component ------------------------------------------------- */

export default function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"TENANT" | "OWNER" | "TECHNICIAN">("TENANT");
  const [passwordValue, setPasswordValue] = useState("");
  const [emailValue, setEmailValue] = useState("");

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPasswordValue(e.target.value);
    },
    []
  );

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmailValue(e.target.value);
    },
    []
  );

  const emailDirty   = emailValue.length > 0;
  const emailValid   = emailDirty && isValidEmail(emailValue);
  const emailInvalid = emailDirty && !emailValid;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {/* Role selector */}
      <div>
        <label className={labelClass}>Votre rôle sur HomeCheck</label>
        <div className="grid grid-cols-3 gap-2.5">
          {(["TENANT", "OWNER", "TECHNICIAN"] as const).map((role) => {
            const labels: Record<string, { title: string; sub: string }> = {
              TENANT:     { title: "Locataire",     sub: "Recherche & location" },
              OWNER:      { title: "Propriétaire",  sub: "Gestion & annonces" },
              TECHNICIAN: { title: "Technicien",    sub: "Interventions" },
            };
            const { title, sub } = labels[role];
            const isSelected = selectedRole === role;
            return (
              <label
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center cursor-pointer transition-all ${
                  isSelected
                    ? "border-[#166534] bg-[#166534] text-white shadow-xs dark:border-white dark:bg-white dark:text-zinc-950"
                    : "border-[#DCFCE7] bg-white/70 text-[#1F2937] hover:border-[#bbf7d0] dark:border-zinc-800 dark:bg-[#151518]/60 dark:text-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role}
                  checked={isSelected}
                  onChange={() => setSelectedRole(role)}
                  className="sr-only"
                />
                <span className="text-xs font-bold">{title}</span>
                <span className="mt-0.5 text-[10px] opacity-75">{sub}</span>
              </label>
            );
          })}
        </div>
      </div>

      {selectedRole === "TECHNICIAN" && (
        <TechnicianFields errors={state.errors} inputClass={fieldClass} labelClass={labelClass} />
      )}

      {/* Name fields */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className={labelClass}>Prénom</label>
          <input
            id="firstName"
            name="firstName"
            autoComplete="given-name"
            required
            minLength={2}
            maxLength={80}
            aria-invalid={!!state.errors?.firstName}
            aria-describedby={state.errors?.firstName ? "firstName-error" : undefined}
            className={fieldClass(!!state.errors?.firstName)}
          />
          {state.errors?.firstName?.map((error) => (
            <p id="firstName-error" key={error} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ))}
        </div>
        <div>
          <label htmlFor="lastName" className={labelClass}>Nom de famille</label>
          <input
            id="lastName"
            name="lastName"
            autoComplete="family-name"
            required
            minLength={2}
            maxLength={80}
            aria-invalid={!!state.errors?.lastName}
            aria-describedby={state.errors?.lastName ? "lastName-error" : undefined}
            className={fieldClass(!!state.errors?.lastName)}
          />
          {state.errors?.lastName?.map((error) => (
            <p id="lastName-error" key={error} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          ))}
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className={labelClass}>Email</label>
        <div className="relative">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={emailValue}
            onChange={handleEmailChange}
            aria-invalid={emailInvalid || !!state.errors?.email}
            aria-describedby="email-hint email-error"
            className={`${fieldClass(emailInvalid || !!state.errors?.email)} pr-10`}
          />
          {/* live validity icon */}
          {emailDirty && (
            <span
              className={`pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-bold transition-colors duration-200 ${
                emailValid
                  ? "text-emerald-500"
                  : "text-red-500"
              }`}
              aria-hidden
            >
              {emailValid ? "✓" : "✗"}
            </span>
          )}
        </div>
        {/* live hint */}
        {emailDirty && !emailValid && !state.errors?.email && (
          <p id="email-hint" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
            Entrez une adresse e-mail valide (ex&nbsp;: nom@domaine.com)
          </p>
        )}
        {emailValid && !state.errors?.email && (
          <p id="email-hint" className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            Adresse e-mail valide ✓
          </p>
        )}
        {state.errors?.email?.map((error) => (
          <p id="email-error" key={error} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ))}
      </div>

      {/* Password + strength meter */}
      <div>
        <label htmlFor="password" className={labelClass}>Mot de passe</label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            value={passwordValue}
            onChange={handlePasswordChange}
            aria-invalid={!!state.errors?.password}
            aria-describedby="password-strength password-error"
            className={`${fieldClass(!!state.errors?.password)} pr-20`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? "Masquer" : "Afficher"}
          </button>
        </div>
        <div id="password-strength">
          <PasswordStrengthBar password={passwordValue} />
        </div>
        {state.errors?.password?.map((error) => (
          <p id="password-error" key={error} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ))}
      </div>

      {/* Confirm password */}
      <div>
        <label htmlFor="confirmPassword" className={labelClass}>Confirmer le mot de passe</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          aria-invalid={!!state.errors?.confirmPassword}
          aria-describedby={state.errors?.confirmPassword ? "confirmPassword-error" : undefined}
          className={fieldClass(!!state.errors?.confirmPassword)}
        />
        {state.errors?.confirmPassword?.map((error) => (
          <p id="confirmPassword-error" key={error} className="mt-1.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ))}
      </div>

      {/* Status message */}
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
        className="flex h-11 w-full items-center justify-center rounded-xl bg-[#166534] px-4 text-sm font-semibold text-white shadow-xs transition-all hover:bg-[#14532d] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {pending ? "Création du compte…" : "Créer mon compte"}
      </button>
    </form>
  );
}
