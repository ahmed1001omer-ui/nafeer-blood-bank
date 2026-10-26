"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost, ApiRequestError } from "@/lib/api";
import { useLanguage } from "@/lib/i18n-context";
import ThemeToggle from "@/components/ThemeToggle";
import LangToggle from "@/components/LangToggle";
import SplashScreen from "@/components/SplashScreen";
import ConnectivityBadge from "@/components/ConnectivityBadge";

function LoginLamp() {
  const [isDark, setIsDark] = useState<boolean>(false);
  const [lampActive, setLampActive] = useState<boolean>(false);

  useEffect(() => {
    const checkDark = () => document.documentElement.classList.contains("dark");
    setIsDark(checkDark());

    const observer = new MutationObserver(() => {
      const darkOn = checkDark();
      setIsDark(darkOn);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isDark) {
      // Dark Mode ON: Wait 1 second (1000ms), then activate bulb glow & ambient light
      timer = setTimeout(() => {
        setLampActive(true);
      }, 1000);
    } else {
      // Light Mode ON: Immediately deactivate lamp & light beam
      setLampActive(false);
    }
    return () => clearTimeout(timer);
  }, [isDark]);

  const toggleTheme = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("bbms_theme", next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      <div
        onClick={toggleTheme}
        className={`login-lamp ${lampActive ? "lamp-active" : ""}`}
        title="تفعيل / إيقاف الوضع الليلي"
        role="button"
        tabIndex={0}
      >
        <div className="lamp-wire" />
        <div className="lamp-holder">
          <div className="lamp-dot" />
          <div className="lamp-glow" />
        </div>
        <div className="lamp-light" />
      </div>

      <div className={`image-light ${lampActive ? "image-light-active" : ""}`} />
    </>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t, lang } = useLanguage();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.get("reset") === "success") {
      setSuccessMsg(
        lang === "en"
          ? "Password reset successfully! You can now log in with your new password."
          : "تم إعادة تعيين كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة."
      );
    }
  }, [params, lang]);

  useEffect(() => {
    fetch("/api/setup")
      .then((res) => res.json())
      .then((data) => {
        if (data?.setupRequired) {
          router.replace("/setup");
        }
      })
      .catch(() => {});
  }, [router]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setErrors({});
    setMessage(null);
    try {
      await apiPost("/api/auth/login", { username, password, remember });
      const next = params.get("next") || "/dashboard";
      router.push(next);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiRequestError) {
        setErrors(error.errors);
        if (Object.keys(error.errors).length === 0) setMessage(error.message);
        if (error.message.includes("إنترنت") || error.message.includes("اتصال") || typeof navigator !== "undefined" && !navigator.onLine) {
          window.dispatchEvent(
            new CustomEvent("app:error", {
              detail: { message: error.message, forceShow: true },
            })
          );
        }
      } else {
        setMessage(t("serverError"));
        window.dispatchEvent(
          new CustomEvent("app:error", {
            detail: { message: "فقدان الاتصال بالشبكة أو الخادم", forceShow: true },
          })
        );
      }
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-[var(--bg-page)] lg:grid-cols-2">
      {/* القسم الأيمن: البصري مع الصورة واللمبة التفاعلية (دائماً في الجهة اليمنى) */}
      <div className="login-art-section relative hidden flex-col justify-between overflow-hidden p-12 lg:flex z-10 ltr:lg:order-2 rtl:lg:order-1">
        {/* الصورة كخلفية غطائية مع فلتر التكيّف في الوضع الليلي */}
        <div
          className="art-image-bg"
          style={{
            backgroundImage: "url(/images/login-art.jpg)",
          }}
        />

        {/* اللمبة التفاعلية للوضع الليلي */}
        <LoginLamp />

        {/* طبقة التعتيم والشفافية المتناسقة Overlay */}
        <div
          className="absolute inset-0 z-10 transition-colors duration-500"
          style={{
            background:
              "linear-gradient(160deg, var(--overlay-bg), rgba(15, 23, 42, 0.78))",
          }}
        />

        {/* الجزء العلوي: الشعار والاسم */}
        <div className="relative z-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <div>
              <p className="font-heading text-[17px] font-bold text-white tracking-wide">
                {t("systemName")}
              </p>
              <p className="text-[13px] text-white/80">{t("hospitalName")}</p>
            </div>
          </div>
        </div>

        {/* المنتصف: النصوص التعريفية مع خلفية شفافة ناعمة */}
        <div className="relative z-20 my-auto py-8">
          <div className="max-w-xl rounded-2xl bg-black/20 p-8 backdrop-blur-md border border-white/10 shadow-2xl">
            <h1 className="font-heading text-[32px] font-bold leading-snug text-white drop-shadow-sm">
              {t("heroTitle")}
            </h1>
            <p className="mt-4 text-[16px] leading-relaxed text-white/90">
              {t("heroSubtitle")}
            </p>
          </div>
        </div>

        {/* التذييل */}
        <div className="relative z-20">
          <p className="text-[13px] font-medium text-white/70">
            {t("demoNotice")}
          </p>
        </div>
      </div>

      {/* القسم الأيسر: نموذج تسجيل الدخول (دائماً في الجهة اليسرى) */}
      <div className="relative flex flex-col justify-between p-6 sm:p-10 lg:p-12 z-0 ltr:lg:order-1 rtl:lg:order-2">
        {/* أزرار التبديل في الأعلى */}
        <div className="flex items-center justify-between w-full mb-6">
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--color-brand)] text-white">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
              </svg>
            </div>
            <div>
              <p className="font-heading text-[15px] font-bold text-[var(--text-ink)]">
                {t("systemName")}
              </p>
            </div>
          </div>

          <div className="ms-auto flex items-center gap-2 sm:gap-3">
            <ConnectivityBadge showDetails />
            <LangToggle />
            <ThemeToggle />
          </div>
        </div>

        <div className="mx-auto my-auto w-full max-w-md animate-rise py-4">
          <h2 className="font-heading text-[28px] font-bold text-[var(--text-ink)]">
            {t("loginTitle")}
          </h2>
          <p className="mt-1.5 text-[14.5px] text-[var(--text-muted)]">
            {t("loginSubtitle")}
          </p>

          {successMsg ? (
            <div className="mt-5 rounded-[12px] bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-[14px] font-medium text-emerald-700 dark:text-emerald-300 animate-fade">
              {successMsg}
            </div>
          ) : null}

          {message ? (
            <div className="mt-5 rounded-[12px] bg-[var(--color-brand-soft)] border border-[var(--color-brand)]/20 px-4 py-3 text-[14px] font-medium text-[#D32F2F] dark:text-[#EF5350] animate-fade">
              {message}
            </div>
          ) : null}

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label className="field-label">{t("usernameLabel")}</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`field-input ${errors.username ? "field-input-invalid" : ""}`}
                placeholder={t("usernamePlaceholder")}
                autoComplete="username"
              />
              {errors.username ? (
                <span className="field-error">{errors.username}</span>
              ) : null}
            </div>

            <div>
              <label className="field-label">{t("passwordLabel")}</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`field-input ${errors.password ? "field-input-invalid" : ""}`}
                  placeholder={t("passwordPlaceholder")}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute inset-y-0 ltr:right-3 rtl:left-3 my-auto h-8 rounded-lg px-2 text-[13px] font-medium text-[var(--text-muted)] hover:text-[var(--text-ink)]"
                >
                  {show ? t("hidePassword") : t("showPassword")}
                </button>
              </div>
              {errors.password ? (
                <span className="field-error">{errors.password}</span>
              ) : null}
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-[var(--text-ink)]">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-[var(--border-line)] accent-[var(--color-brand)] cursor-pointer"
                />
                {t("rememberMe")}
              </label>
              <Link href="/forgot-password" className="text-[13.5px] font-medium text-[var(--color-brand)] hover:underline">
                {lang === "en" ? "Forgot password?" : "نسيت كلمة المرور؟"}
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full h-11 text-[16px] font-semibold shadow-md"
            >
              {loading ? t("loggingIn") : t("loginButton")}
            </button>

            {process.env.NODE_ENV !== "production" && (
              <div className="mt-6 pt-5 border-t border-[var(--border-line)]">
                <p className="text-xs text-[var(--text-muted)] mb-2 text-center">
                  {lang === "en" ? "Quick Login (Dev only):" : "تسجيل دخول سريع (بيئة التطوير فقط):"}
                </p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {[
                    { user: "admin", pass: "admin123", label: "مدير النظام" },
                    { user: "manager", pass: "manager123", label: "مدير البنك" },
                    { user: "reception", pass: "reception123", label: "الاستقبال" },
                    { user: "lab", pass: "lab123", label: "المختبر" },
                    { user: "inventory", pass: "inventory123", label: "المخزون" },
                    { user: "it", pass: "it123", label: "التقارير" },
                  ].map((item) => (
                    <button
                      key={item.user}
                      type="button"
                      onClick={() => {
                        setUsername(item.user);
                        setPassword(item.pass);
                        setErrors({});
                        setMessage(null);
                      }}
                      className="text-[11.5px] px-2.5 py-1 rounded-md bg-[var(--bg-card)] hover:bg-brand/10 border border-[var(--border-line)] text-[var(--text-ink)] transition-colors"
                    >
                      {item.label} ({item.user})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* التذييل العام */}
        <div className="text-center lg:text-start text-[12.5px] text-[var(--text-muted)]">
          {t("systemName")} © {new Date().getFullYear()} — {t("hospitalName")}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <SplashScreen />
      <Suspense fallback={<div className="min-h-screen bg-[var(--bg-page)]" />}>
        <LoginForm />
      </Suspense>
    </>
  );
}
