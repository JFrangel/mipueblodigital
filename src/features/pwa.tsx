"use client";
import { useEffect } from "react";
export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          /* App stays usable when installation is unavailable. */
        });
  }, []);
  return null;
}
