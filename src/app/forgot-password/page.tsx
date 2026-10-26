"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n-context";
import ConnectivityBadge from "@/components/ConnectivityBadge";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [targetAccount, setTargetAccount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError(lang === "en" ? "Please enter email, phone, or username" : "يرجى إدخال اسم المستخدم أو البريد الإلكتروني أو رقم الهاتف");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    setGeneratedCode("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        const resolvedAccount = data.username || identifier.trim();
        setTargetAccount(resolvedAccount);
        if (data.devCode) {
          setGeneratedCode(data.devCode);
        }
        setTimeout(() => {
          router.push(`/reset-password?identifier=${encodeURIComponent(resolvedAccount)}&code=${encodeURIComponent(data.devCode || "")}`);
        }, 5000);
      } else {
        setError(data.message || (lang === "en" ? "Failed to send reset code" : "تعذر إرسال رمز التحقق"));
      }
    } catch {
      setError(lang === "en" ? "Network error - please check your internet connection" : "حدث خطأ في الاتصال - يرجى التأكد من توفر اتصال نشط بالإنترنت");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] p-4">
      <div className="w-full max-w-md surface rounded-2xl p-6 sm:p-8 shadow-xl border border-[var(--border-line)] animate-rise">
        <div className="flex justify-between items-center mb-4">
          <Link href="/login" className="text-xs text-brand hover:underline font-medium">
            {lang === "en" ? "← Back" : "← العودة"}
          </Link>
          <ConnectivityBadge showDetails />
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand/10 text-brand font-bold text-2xl mb-3">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-ink">
            {lang === "en" ? "Online Password Reset" : "استعادة كلمة المرور أونلاين"}
          </h1>
          <p className="text-sm text-muted mt-1.5 leading-relaxed">
            {lang === "en"
              ? "Requires active internet connection. Enter your account to dispatch the OTP code via email/SMS."
              : "يتطلب توفر اتصال بالإنترنت لإرسال رمز التحقق (OTP) إلى بريدك الإلكتروني أو هاتفك."}
          </p>
        </div>

        {generatedCode && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-100 text-center animate-pop">
            <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-emerald-700 dark:text-emerald-300">
              {lang === "en" ? "Online Dispatch Confirmed:" : "تم إرسال رمز التحقق أونلاين:"}
            </p>
            <p className="text-3xl font-mono font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400 my-2 select-all">
              {generatedCode}
            </p>
            <button
              type="button"
              onClick={() => {
                router.push(`/reset-password?identifier=${encodeURIComponent(targetAccount || identifier.trim())}&code=${encodeURIComponent(generatedCode)}`);
              }}
              className="btn btn-primary w-full py-2.5 text-sm font-bold shadow-md mt-2"
            >
              {lang === "en" ? "Proceed to Password Reset →" : "المتابعة لإعادة تعيين كلمة المرور ←"}
            </button>
          </div>
        )}

        {message && !generatedCode && (
          <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-300 text-sm leading-relaxed">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm leading-relaxed">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">
              {lang === "en" ? "Username, Email, or Phone" : "اسم المستخدم، البريد، أو الهاتف"}
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="field-input"
              placeholder={lang === "en" ? "e.g. admin or 0912345678" : "مثال: admin أو 0912345678"}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn btn-primary py-3 text-base font-semibold mt-2"
          >
            {loading
              ? lang === "en"
                ? "Connecting & Sending Code..."
                : "جاري التحقق والإرسال أونلاين..."
              : lang === "en"
              ? "Send Verification Code (Online)"
              : "إرسال رمز التحقق (أونلاين)"}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[var(--border-line)]">
          <p className="text-xs text-muted mb-2 text-center">
            {lang === "en" ? "Select Account:" : "تحديد الحساب:"}
          </p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {[
              { id: "admin", label: "admin" },
              { id: "manager", label: "manager" },
              { id: "reception", label: "reception" },
              { id: "lab", label: "lab" },
              { id: "inventory", label: "inventory" },
              { id: "it", label: "it" },
            ].map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => setIdentifier(acc.id)}
                className="text-[11px] px-2.5 py-1 rounded-md bg-[var(--bg-card)] hover:bg-brand/10 border border-[var(--border-line)] text-ink transition-colors"
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 text-center text-sm border-t border-[var(--border-line)] pt-4">
          <Link href="/login" className="text-brand hover:underline font-medium">
            {lang === "en" ? "← Back to Login" : "← العودة لتسجيل الدخول"}
          </Link>
        </div>
      </div>
    </div>
  );
}
