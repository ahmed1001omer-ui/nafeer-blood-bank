"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n-context";

interface ConnectivityBadgeProps {
  showDetails?: boolean;
  className?: string;
}

export default function ConnectivityBadge({ showDetails = false, className = "" }: ConnectivityBadgeProps) {
  const { lang } = useLanguage();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [checking, setChecking] = useState<boolean>(false);

  const checkStatus = async () => {
    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setIsOnline(false);
        return;
      }
      const res = await fetch("/api/network-status", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setIsOnline(Boolean(data.online));
      } else {
        setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : false);
      }
    } catch {
      setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : false);
    }
  };

  useEffect(() => {
    checkStatus();

    const handleOnline = () => checkStatus();
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic check every 15 seconds
    const interval = setInterval(checkStatus, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
        isOnline
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
          : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20"
      } ${className}`}
      title={
        isOnline
          ? lang === "en"
            ? "Connected to Internet. Online OTP sending and external notifications enabled."
            : "متصل بالإنترنت: إرسال رمز التحقق أونلاين والإشعارات الخارجية مفعلة."
          : lang === "en"
            ? "Offline Mode: Local database operations (login, inventory, registration) active."
            : "الوضع المحلي دون اتصال: تسجيل الدخول والمخزون والتسجيل تعمل محلياً بالكامل."
      }
    >
      <span
        className={`h-2 w-2 rounded-full shrink-0 ${
          isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
        }`}
      />
      <span>
        {isOnline
          ? lang === "en"
            ? "Online (Internet)"
            : "متصل بالإنترنت (Online)"
          : lang === "en"
          ? "Offline Mode"
          : "الوضع المحلي دون اتصال"}
      </span>
      {showDetails && (
        <span className="text-[11px] opacity-75 hidden sm:inline">
          {isOnline
            ? lang === "en"
              ? "— OTP dispatch ready"
              : "— إرسال الرموز متاح"
            : lang === "en"
            ? "— Local storage active"
            : "— المخزون والتسجيل محلياً"}
        </span>
      )}
    </div>
  );
}
