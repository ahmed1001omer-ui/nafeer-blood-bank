"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import lottie, { AnimationItem } from "lottie-web";
import { useLanguage } from "@/lib/i18n-context";
import errorData from "../../public/error-animation.json";

export default function ErrorOverlay() {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [countdown, setCountdown] = useState(5);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const closeOverlay = useCallback(() => {
    setVisible(false);
    setErrorMessage("");
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const triggerError = useCallback(
    (message?: string) => {
      const defaultMsg = t("connectionErrorMsg");
      setErrorMessage(message || defaultMsg);
      setCountdown(5);
      setVisible(true);

      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }

      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            closeOverlay();
            return 5;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [t, closeOverlay]
  );

  const hasShownOfflineNoticeRef = useRef(false);

  useEffect(() => {
    // 1. تظهر الرسالة مرة واحدة فقط عند انقطاع الإنترنت لتنبيه المستخدم
    const handleOffline = () => {
      if (!hasShownOfflineNoticeRef.current) {
        hasShownOfflineNoticeRef.current = true;
        triggerError(t("connectionErrorMsg"));
      }
    };

    // إعادة الضبط عند عودة الإنترنت ليتمكن من التنبيه مرة واحدة إذا انقطع مجدداً لاحقاً
    const handleOnline = () => {
      hasShownOfflineNoticeRef.current = false;
    };

    // 2. تظهر عند تسجيل الدخول أو نشر المنشور أو أخطاء الخادم الكارثية فقط، وخلاف ذلك لا تظهر أبداً
    const handleCustomError = (
      e: CustomEvent<{ message?: string; isServerError?: boolean; forceShow?: boolean }>
    ) => {
      if (e.detail?.forceShow || e.detail?.isServerError) {
        triggerError(e.detail?.message);
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("app:error", handleCustomError as EventListener);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("app:error", handleCustomError as EventListener);
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [t, triggerError]);

  useEffect(() => {
    if (!visible || !containerRef.current) {
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
      return;
    }

    try {
      animRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData: errorData,
      });
    } catch (err) {
      console.error("Lottie error animation load error:", err);
    }

    return () => {
      if (animRef.current) {
        animRef.current.destroy();
        animRef.current = null;
      }
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-fade"
      role="dialog"
      aria-modal="true"
      aria-labelledby="error-overlay-title"
    >
      <div className="surface flex flex-col items-center justify-center p-6 sm:p-8 max-w-md w-full rounded-[24px] shadow-[0_20px_60px_rgba(0,0,0,0.3)] text-center animate-pop border border-[var(--border-line)]">
        <div
          ref={containerRef}
          className="w-[260px] h-[180px] sm:w-[300px] sm:h-[200px] flex items-center justify-center my-2"
        />

        <h3
          id="error-overlay-title"
          className="font-heading text-[20px] font-bold text-[#D32F2F] dark:text-[#EF5350] mt-2"
        >
          {t("connectionErrorTitle")}
        </h3>

        <p className="text-[14px] leading-relaxed text-[var(--text-muted)] mt-2 mb-4">
          {errorMessage || t("connectionErrorMsg")}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full mt-2">
          <button
            type="button"
            onClick={closeOverlay}
            className="btn btn-primary h-11 px-8 text-[15px] font-semibold w-full sm:w-auto shadow-md"
          >
            {t("tryAgain")}
          </button>
        </div>

        <p className="text-[12.5px] text-[var(--text-muted)] mt-4 font-num">
          {t("dismissIn")}{" "}
          <span className="font-bold text-[var(--color-brand)]">{countdown}</span>{" "}
          {t("secondsUnit")}
        </p>
      </div>
    </div>
  );
}
