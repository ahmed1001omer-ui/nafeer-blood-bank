"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n-context";
import ConnectivityBadge from "@/components/ConnectivityBadge";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang } = useLanguage();

  const [identifier, setIdentifier] = useState(searchParams.get("identifier") || "");
  const [otp, setOtp] = useState(searchParams.get("code") || searchParams.get("otp") || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const codeParam = searchParams.get("code") || searchParams.get("otp");
    if (codeParam) setOtp(codeParam);
    const idParam = searchParams.get("identifier");
    if (idParam) setIdentifier(idParam);
  }, [searchParams]);

  const handleResend = async () => {
    if (!identifier.trim()) {
      setError(lang === "en" ? "Enter username, email, or phone first" : "يرجى إدخال اسم المستخدم أو البريد أولاً");
      return;
    }

    setResending(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.devCode) {
          setOtp(data.devCode);
          setMessage(lang === "en" ? `New code generated and filled: ${data.devCode}` : `تم إصدار رمز جديد وتعبئته تلقائياً: ${data.devCode}`);
        } else {
          setMessage(data.message || (lang === "en" ? "Code sent" : "تم إرسال الرمز"));
        }
      } else {
        setError(data.message || (lang === "en" ? "Failed to resend code" : "تعذر إعادة إرسال الرمز"));
      }
    } catch {
      setError(lang === "en" ? "Network error - internet connection required" : "حدث خطأ في الاتصال - يلزم توفر اتصال نشط بالإنترنت لإرسال الرمز");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError(lang === "en" ? "Please enter your username, email, or phone" : "يرجى إدخال اسم الحساب");
      return;
    }
    if (!otp.trim()) {
      setError(lang === "en" ? "Please enter the OTP code" : "يرجى إدخال رمز التحقق");
      return;
    }
    if (newPassword.length < 6) {
      setError(lang === "en" ? "New password must be at least 6 characters" : "كلمة المرور الجديدة يجب أن تكون 6 أحرف فأكثر");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(lang === "en" ? "Passwords do not match" : "كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), otp: otp.trim(), newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setTimeout(() => {
          router.push("/login?reset=success");
        }, 1500);
      } else {
        setError(data.message || (lang === "en" ? "Password reset failed" : "فشل إعادة تعيين كلمة المرور"));
      }
    } catch {
      setError(lang === "en" ? "Network error - internet connection required" : "حدث خطأ في الاتصال - يلزم توفر اتصال نشط بالإنترنت لإرسال الرمز");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md surface rounded-2xl p-6 sm:p-8 shadow-xl border border-[var(--border-line)] animate-rise">
      <div className="flex justify-between items-center mb-4">
        <Link href="/login" className="text-xs text-brand hover:underline font-medium">
          {lang === "en" ? "← Back" : "← العودة"}
        </Link>
        <ConnectivityBadge showDetails />
      </div>

      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand/10 text-brand font-bold text-2xl mb-3">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h1 className="text-2xl font-bold text-ink">
          {lang === "en" ? "Reset Password" : "إعادة تعيين كلمة المرور"}
        </h1>
        <p className="text-sm text-muted mt-1">
          {lang === "en"
            ? "Enter the OTP code and choose your new password"
            : "أدخل رمز التحقق وقم بتعيين كلمة المرور الجديدة"}
        </p>
      </div>

      {otp && !error && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs text-center font-medium">
          {lang === "en"
            ? `Verification code auto-filled: ${otp}`
            : `تم إدراج رمز التحقق تلقائياً: (${otp}) - يمكنك تعيين كلمة المرور الجديدة مباشرة`}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm text-center font-medium">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="field-label">
            {lang === "en" ? "Username / Email / Phone" : "اسم المستخدم / البريد / الهاتف"}
          </label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="field-input"
            placeholder={lang === "en" ? "User account" : "اسم الحساب"}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="field-label !mb-0">
              {lang === "en" ? "Verification OTP Code" : "رمز التحقق (OTP)"}
            </label>
            <button
              type="button"
              disabled={resending}
              onClick={handleResend}
              className="text-xs font-semibold text-brand hover:underline disabled:opacity-50"
            >
              {resending
                ? lang === "en" ? "Sending..." : "جاري الإرسال..."
                : lang === "en" ? "Resend code" : "إعادة إرسال الرمز"}
            </button>
          </div>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="field-input tracking-widest text-center text-lg font-mono font-bold"
            placeholder="123456"
            maxLength={6}
          />
        </div>

        <div>
          <label className="field-label">
            {lang === "en" ? "New Password" : "كلمة المرور الجديدة"}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="field-input"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="field-label">
            {lang === "en" ? "Confirm New Password" : "تأكيد كلمة المرور الجديدة"}
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="field-input"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full btn btn-primary py-3 text-base font-semibold mt-2"
        >
          {loading
            ? lang === "en"
              ? "Resetting..."
              : "جاري إعادة التعيين..."
            : lang === "en"
            ? "Confirm Reset Password"
            : "تأكيد تغيير كلمة المرور"}
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-[var(--border-line)]">
        <p className="text-xs text-muted mb-2 text-center">
          {lang === "en" ? "Select Account:" : "تحديد سريع للحساب:"}
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
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] p-4">
      <Suspense fallback={<p className="text-muted">Loading...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
