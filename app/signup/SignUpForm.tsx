"use client";

import { useActionState } from "react";
import { signUp, type SignUpState } from "@/app/actions/auth";

const initialState: SignUpState = {
  success: false,
  message: "",
};

export default function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUp, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="firstName">First name</label>
        <input
          id="firstName"
          name="firstName"
          autoComplete="given-name"
          required
          minLength={2}
          maxLength={80}
          className="block w-full rounded border p-2"
        />
        {state.errors?.firstName?.map((error) => (
          <p key={error} className="text-sm text-red-600">
            {error}
          </p>
        ))}
      </div>

      <div>
        <label htmlFor="lastName">Last name</label>
        <input
          id="lastName"
          name="lastName"
          autoComplete="family-name"
          required
          minLength={2}
          maxLength={80}
          className="block w-full rounded border p-2"
        />
        {state.errors?.lastName?.map((error) => (
          <p key={error} className="text-sm text-red-600">
            {error}
          </p>
        ))}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          className="block w-full rounded border p-2"
        />
        {state.errors?.email?.map((error) => (
          <p key={error} className="text-sm text-red-600">
            {error}
          </p>
        ))}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          className="block w-full rounded border p-2"
        />
        {state.errors?.password?.map((error) => (
          <p key={error} className="text-sm text-red-600">
            {error}
          </p>
        ))}
      </div>

      <div>
        <label htmlFor="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          className="block w-full rounded border p-2"
        />
        {state.errors?.confirmPassword?.map((error) => (
          <p key={error} className="text-sm text-red-600">
            {error}
          </p>
        ))}
      </div>

      {state.message && (
        <p
          role="status"
          className={state.success ? "text-green-700" : "text-red-600"}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
