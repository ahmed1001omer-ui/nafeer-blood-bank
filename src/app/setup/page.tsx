"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n-context";

export default function SetupPage() {
  const router = useRouter();
  const { lang, t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  // Institution info
  const [bloodBankName, setBloodBankName] = useState("بنك الدم المركزي");
  const [hospitalName, setHospitalName] = useState("المستشفى المركزي");
  const [city, setCity] = useState("الخرطوم");
  const [bankPhone, setBankPhone] = useState("");
  const [address, setAddress] = useState("");

  // Admin user info
  const [username, setUsername] = useState("admin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    fetch("/api/setup")
      .then((res) => res.json())
      .then((data) => {
        if (!data.setupRequired) {
          router.replace("/login");
        } else {
          setSetupRequired(true);
        }
      })
      .catch(() => {
        setServerError(lang === "en" ? "Failed to check setup status" : "تعذر التحقق من حالة الإعداد");
      })
      .finally(() => setLoading(false));
  }, [router, lang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setServerError("");

    const newErrors: Record<string, string> = {};
    if (!bloodBankName.trim()) newErrors.bloodBankName = lang === "en" ? "Blood bank name is required" : "اسم بنك الدم مطلوب";
    if (!hospitalName.trim()) newErrors.hospitalName = lang === "en" ? "Hospital name is required" : "اسم المستشفى مطلوب";
    if (!username.trim()) newErrors.username = lang === "en" ? "Username is required" : "اسم المستخدم مطلوب";
    if (!fullName.trim()) newErrors.fullName = lang === "en" ? "Full name is required" : "الاسم الكامل مطلوب";
    if (!password) newErrors.password = lang === "en" ? "Password is required" : "كلمة المرور مطلوبة";
    else if (password.length < 6) newErrors.password = lang === "en" ? "Password must be at least 6 characters" : "كلمة المرور يجب أن تكون 6 أحرف فأكثر";
    if (password !== confirmPassword) newErrors.confirmPassword = lang === "en" ? "Passwords do not match" : "كلمتا المرور غير متطابقتين";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bloodBankName: bloodBankName.trim(),
          hospitalName: hospitalName.trim(),
          city: city.trim(),
          bankPhone: bankPhone.trim(),
          address: address.trim(),
          username: username.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else setServerError(data.message || (lang === "en" ? "Setup failed" : "فشل الإعداد"));
      } else {
        router.replace("/login?setup=success");
      }
    } catch {
      setServerError(lang === "en" ? "Network error occurred" : "حدث خطأ في الاتصال بالشبكة");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)]">
        <p className="text-muted">{lang === "en" ? "Checking system status..." : "جاري التحقق من حالة النظام..."}</p>
      </div>
    );
  }

  if (!setupRequired) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] p-4 sm:p-6 my-auto">
      <div className="w-full max-w-2xl surface rounded-2xl p-6 sm:p-8 shadow-xl border border-[var(--border-line)] animate-rise my-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand/10 text-brand font-bold text-3xl mb-3">
            🩸
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">
            {lang === "en" ? "System Initial Setup" : "تهيئة النظام الأولية"}
          </h1>
          <p className="text-sm text-muted mt-2 max-w-lg mx-auto">
            {lang === "en"
              ? "Configure your medical facility and set up the first Super Administrator account to begin using the system"
              : "قم بتهيئة بيانات المنشأة الطبية وإنشاء حساب مسؤول النظام الأول للبدء في استخدام بنك الدم"}
          </p>
        </div>

        {serverError && (
          <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Institution Details */}
          <div className="rounded-xl border border-[var(--border-line)] bg-[var(--bg-card)] p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border-line)] pb-3">
              <h2 className="text-base font-bold text-ink">
                {lang === "en" ? "Medical Facility & Blood Bank Details" : "بيانات المنشأة الطبية وبنك الدم"}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">
                  {lang === "en" ? "Blood Bank Name" : "اسم بنك الدم"} <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={bloodBankName}
                  onChange={(e) => setBloodBankName(e.target.value)}
                  className={`field-input ${errors.bloodBankName ? "field-input-invalid" : ""}`}
                  placeholder={lang === "en" ? "e.g. Central Blood Bank" : "مثال: بنك الدم المركزي"}
                />
                {errors.bloodBankName && <span className="field-error">{errors.bloodBankName}</span>}
              </div>

              <div>
                <label className="field-label">
                  {lang === "en" ? "Hospital / Institution Name" : "اسم المستشفى / المؤسسة الصحية"} <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className={`field-input ${errors.hospitalName ? "field-input-invalid" : ""}`}
                  placeholder={lang === "en" ? "e.g. University Teaching Hospital" : "مثال: المستشفى التعليمي المركزي"}
                />
                {errors.hospitalName && <span className="field-error">{errors.hospitalName}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">{lang === "en" ? "City / Region" : "المدينة / الولاية"}</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="field-input"
                  placeholder={lang === "en" ? "e.g. Capital City" : "مثال: الخرطوم، ودمدني، بورتسودان..."}
                />
              </div>

              <div>
                <label className="field-label">{lang === "en" ? "Bank Contact Phone" : "هاتف التواصل لبنك الدم"}</label>
                <input
                  type="tel"
                  value={bankPhone}
                  onChange={(e) => setBankPhone(e.target.value)}
                  className="field-input"
                  placeholder="0912345678"
                />
              </div>
            </div>

            <div>
              <label className="field-label">{lang === "en" ? "Physical Address" : "العنوان والموقع الجغرافي"}</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="field-input"
                placeholder={lang === "en" ? "e.g. Main Medical Complex, Building B" : "مثال: المجمع الطبي الرئيسي، شارع المستشفى"}
              />
            </div>
          </div>

          {/* Section 2: Super Admin Account */}
          <div className="rounded-xl border border-[var(--border-line)] bg-[var(--bg-card)] p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[var(--border-line)] pb-3">
              <h2 className="text-base font-bold text-ink">
                {lang === "en" ? "Super Administrator Account" : "بيانات مدير النظام (المسؤول الأول)"}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">
                  {t("usernameLabel")} <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={`field-input ${errors.username ? "field-input-invalid" : ""}`}
                  placeholder="admin"
                />
                {errors.username && <span className="field-error">{errors.username}</span>}
              </div>

              <div>
                <label className="field-label">
                  {lang === "en" ? "Full Name" : "الاسم الكامل للمدير"} <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className={`field-input ${errors.fullName ? "field-input-invalid" : ""}`}
                  placeholder={lang === "en" ? "System Administrator" : "د. محمد أحمد (مدير النظام)"}
                />
                {errors.fullName && <span className="field-error">{errors.fullName}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">{lang === "en" ? "Admin Email" : "البريد الإلكتروني للمدير"}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input"
                  placeholder="admin@hospital.local"
                />
              </div>
              <div>
                <label className="field-label">{lang === "en" ? "Admin Phone" : "رقم هاتف المدير"}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="field-input"
                  placeholder="0912345678"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">
                  {t("passwordLabel")} <span className="required">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`field-input ${errors.password ? "field-input-invalid" : ""}`}
                  placeholder="••••••••"
                />
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              <div>
                <label className="field-label">
                  {lang === "en" ? "Confirm Password" : "تأكيد كلمة المرور"} <span className="required">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`field-input ${errors.confirmPassword ? "field-input-invalid" : ""}`}
                  placeholder="••••••••"
                />
                {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn btn-primary py-3 text-base font-semibold shadow-lg shadow-brand/20 hover:shadow-brand/30 transition-all"
          >
            {submitting
              ? lang === "en"
                ? "Configuring System & Initializing..."
                : "جاري حفظ الإعدادات وتهيئة النظام..."
              : lang === "en"
              ? "Complete Setup & Launch System"
              : "إكمال التهيئة وبدء تشغيل النظام"}
          </button>
        </form>
      </div>
    </div>
  );
}
