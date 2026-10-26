"use client";

import { useEffect } from "react";

// Le service worker n'est enregistré qu'en production : en dev, le HMR et les
// chunks non hashés rendent le cache du SW contre-productif. Pour tester le
// mode hors ligne en local : `npm run build && npm start` (voir README).
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
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
