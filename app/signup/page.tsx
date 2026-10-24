import type { Metadata } from "next";
import Link from "next/link";
import SignUpForm from "./SignUpForm";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your HomeCheck account to browse and manage properties.",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <main className="w-full max-w-md">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              HomeCheck
            </Link>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Create your account
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Browse listings, save favorites, and manage your rentals in one
              place.
            </p>
          </div>

          <SignUpForm />

          <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-500">
          <Link
            href="/"
            className="font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            ← Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}
