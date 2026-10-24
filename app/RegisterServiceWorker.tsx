"use client";

import { useEffect } from "react";

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.info("HomeCheck PWA ServiceWorker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.error("HomeCheck PWA ServiceWorker registration failed:", error);
          });
      });
    }
  }, []);

  return null;
}
