"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle({
  className = "",
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);

    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
  };

  if (!mounted) {
    return (
      <div
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Activer le thème Vert Clair" : "Activer le thème Sombre"}
      title={isDark ? "Passer au thème Vert Clair" : "Passer au thème Sombre"}
      className={`group relative inline-flex h-8 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E] active:scale-95 ${
        isDark
          ? "bg-zinc-800/80 text-amber-300 hover:bg-zinc-800 hover:text-amber-200 border border-zinc-700/60"
          : "bg-[#DCFCE7] text-[#166534] hover:bg-[#bbf7d0] border border-[#bbf7d0]"
      } ${className}`}
    >
      {isDark ? (
        // Sun icon (click to switch to light/green mode)
        <svg
          className="h-4 w-4 transition-transform duration-300 group-hover:rotate-45 text-amber-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      ) : (
        // Moon & Stars icon (click to switch to dark mode)
        <svg
          className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12 text-[#166534]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          <path d="M19 3v4" />
          <path d="M21 5h-4" />
        </svg>
      )}

      {showLabel && (
        <span className="hidden sm:inline font-semibold">
          {isDark ? "Vert Clair" : "Sombre"}
        </span>
      )}
    </button>
  );
}
