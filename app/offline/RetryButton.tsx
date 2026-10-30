"use client";

import { buttonClasses } from "@/app/budget/_components/ui/Button";

export default function RetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className={buttonClasses("primary")}
    >
      Réessayer
    </button>
  );
}
