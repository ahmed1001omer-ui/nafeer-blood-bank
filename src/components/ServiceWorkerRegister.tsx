"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            // التحقق من وجود تحديثات دورياً بهدوء
            reg.update().catch(() => {});
          })
          .catch((err) => {
            console.warn("[SW] Registration skipped or failed:", err);
          });
      });
    }
  }, []);

  return null;
}
