"use client";

import { useState } from "react";
import { Badge, Button, Card, EmptyState, Field, Modal, PageHeader, SectionTitle, StatCard, TextInput } from "@/components/ui";
import { apiPost, useResource } from "@/lib/api";
import { useCan, useSession } from "@/lib/session-context";
import { ROLE_LABELS } from "@/lib/rbac";
import { useLanguage } from "@/lib/i18n-context";

export type CommunicationConfigUI = {
  emailEnabled: boolean;
  emailProvider: "smtp" | "resend";
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  resendApiKey: string;
  fromEmail: string;
  fromName: string;

  smsEnabled: boolean;
  smsProvider: "twilio" | "custom_http" | "whatsapp";
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromNumber: string;
  customSmsUrl: string;
  customSmsMethod: "GET" | "POST";
  customSmsApiKey: string;
  customSmsSenderId: string;

  whatsappEnabled: boolean;
  whatsappPhoneNumberId: string;
  whatsappAccessToken: string;
};

type Settings = {
  status: { database: string; api: string; system: string; lastUpdate: string; operationsToday: number; totalUnits: number };
  thresholds: { bloodType: string; minUnits: number }[];
  bloodBank: { name: string; hospitalName?: string; city?: string; address: string; phone: string };
  communication?: CommunicationConfigUI;
};

const DEFAULT_COMM_CONFIG: CommunicationConfigUI = {
  emailEnabled: false,
  emailProvider: "smtp",
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpSecure: false,
  smtpUser: "",
  smtpPass: "",
  resendApiKey: "",
  fromEmail: "noreply@nafeer.org",
  fromName: "بنك الدم المركزي - نفير",

  smsEnabled: false,
  smsProvider: "twilio",
  twilioAccountSid: "",
  twilioAuthToken: "",
  twilioFromNumber: "",
  customSmsUrl: "",
  customSmsMethod: "GET",
  customSmsApiKey: "",
  customSmsSenderId: "NAFEER",

  whatsappEnabled: false,
  whatsappPhoneNumberId: "",
  whatsappAccessToken: "",
};

export default function SettingsClient() {
  const { t, lang } = useLanguage();
  const { data, loading, error, refresh } = useResource<Settings>("/api/settings");
  const user = useSession();
  const canAccess = useCan();

  // Blood bank state
  const [bankDraft, setBankDraft] = useState<Settings["bloodBank"] | null>(null);
  const [savingBank, setSavingBank] = useState(false);
  const [bankMessage, setBankMessage] = useState("");

  // Communication settings state
  const [commDraft, setCommDraft] = useState<CommunicationConfigUI | null>(null);
  const [savingComm, setSavingComm] = useState(false);
  const [commMessage, setCommMessage] = useState("");
  const [commActiveTab, setCommActiveTab] = useState<"email" | "sms" | "whatsapp">("email");

  // Live test state
  const [testTargetEmail, setTestTargetEmail] = useState("");
  const [testTargetPhone, setTestTargetPhone] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [testingWa, setTestingWa] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // System reset state
  const [resettingSystem, setResettingSystem] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [resetError, setResetError] = useState("");

  const handleResetSystem = async () => {
    if (resetConfirmText.trim() !== "RESET" && resetConfirmText.trim() !== "إعادة تهيئة") {
      setResetError(lang === "en" ? "Please type RESET to confirm" : "يرجى كتابة RESET للتأكيد");
      return;
    }
    setResettingSystem(true);
    setResetError("");
    try {
      const res = await apiPost<{ success: boolean; redirectTo: string }>("/api/settings/reset-system", {
        confirmText: resetConfirmText.trim(),
      });
      if (res.redirectTo) {
        window.location.href = res.redirectTo;
      }
    } catch (cause) {
      setResetError(cause instanceof Error ? cause.message : (lang === "en" ? "Failed to reset system" : "تعذر إعادة تهيئة النظام"));
      setResettingSystem(false);
    }
  };

  const bank = bankDraft ?? data?.bloodBank ?? { name: "", hospitalName: "", city: "", address: "", phone: "" };
  const comm = commDraft ?? data?.communication ?? DEFAULT_COMM_CONFIG;

  const saveBank = async () => {
    setSavingBank(true);
    setBankMessage("");
    try {
      await apiPost("/api/settings", bank);
      setBankDraft(bank);
      setBankMessage(lang === "en" ? "Blood bank information saved." : "تم حفظ معلومات بنك الدم والمستشفى بنجاح.");
      refresh();
    } catch (cause) {
      setBankMessage(cause instanceof Error ? cause.message : (lang === "en" ? "Could not save settings." : "تعذر حفظ الإعدادات."));
    } finally {
      setSavingBank(false);
    }
  };

  const saveComm = async () => {
    setSavingComm(true);
    setCommMessage("");
    try {
      const res = await apiPost<{ communication: CommunicationConfigUI }>("/api/settings", {
        target: "communication",
        communication: comm,
      });
      if (res.communication) {
        setCommDraft(res.communication);
      }
      setCommMessage(lang === "en" ? "Communication settings saved successfully." : "تم حفظ إعدادات بوابات الإرسال بنجاح.");
      refresh();
    } catch (cause) {
      setCommMessage(cause instanceof Error ? cause.message : (lang === "en" ? "Failed to save communication settings." : "تعذر حفظ إعدادات الإرسال."));
    } finally {
      setSavingComm(false);
    }
  };

  const runTestCommunication = async (type: "email" | "sms" | "whatsapp") => {
    const target = type === "email" ? testTargetEmail.trim() : testTargetPhone.trim();
    if (!target) {
      setTestResult({
        ok: false,
        msg: type === "email"
          ? (lang === "en" ? "Please enter an email address for testing." : "يرجى إدخال البريد الإلكتروني لإجراء الاختبار.")
          : (lang === "en" ? "Please enter a phone number for testing." : "يرجى إدخال رقم الهاتف لإجراء الاختبار."),
      });
      return;
    }

    if (type === "email") setTestingEmail(true);
    if (type === "sms") setTestingSms(true);
    if (type === "whatsapp") setTestingWa(true);
    setTestResult(null);

    try {
      const res = await apiPost<{ ok: boolean; message: string }>("/api/settings/test-communication", {
        type,
        target,
      });
      setTestResult({ ok: res.ok, msg: res.message });
    } catch (cause) {
      setTestResult({
        ok: false,
        msg: cause instanceof Error ? cause.message : (lang === "en" ? "Test message failed to send." : "تعذر إرسال الرسالة الاختبارية."),
      });
    } finally {
      setTestingEmail(false);
      setTestingSms(false);
      setTestingWa(false);
    }
  };

  const translateStatus = (val: string) => {
    if (lang === "en") {
      if (val === "متصلة") return "Connected";
      if (val === "غير متصلة") return "Disconnected";
      if (val === "يعمل") return "Operational";
      if (val === "سليم") return "Healthy";
      if (val === "يوجد خلل") return "Issue Detected";
    }
    return val;
  };

  return (
    <div className="animate-rise space-y-4">
      <PageHeader
        title={t("settings")}
        description={lang === "en" ? "System status, institutional profile, and communication gateways" : "حالة النظام، هوية المؤسسة، وبوابات إرسال الرسائل والبريد"}
      />

      {loading ? (
        <Card><EmptyState title={t("loading")} /></Card>
      ) : error || !data ? (
        <Card>
          <EmptyState title={t("errorLoading")} />
          <div className="text-center"><button className="btn btn-primary" onClick={refresh}>{t("retry")}</button></div>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={lang === "en" ? "Database" : "قاعدة البيانات"} value={translateStatus(data.status.database)} />
            <StatCard label={lang === "en" ? "API Status" : "حالة API"} value={translateStatus(data.status.api)} />
            <StatCard label={lang === "en" ? "System Status" : "حالة النظام"} value={translateStatus(data.status.system)} accent />
            <StatCard label={t("todayOperations")} value={data.status.operationsToday} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle title={lang === "en" ? "My Account" : "حسابي"} />
              {user ? (
                <div className="space-y-2 text-[13px]">
                  <Row label={t("name")} value={user.fullName} />
                  <Row label={t("usernameLabel")} value={`@${user.username}`} />
                  <Row label={lang === "en" ? "Role" : "الدور"} value={ROLE_LABELS[user.role] ?? user.role} />
                  <Row label={lang === "en" ? "Permissions Count" : "عدد الصلاحيات"} value={String(user.permissions.length)} />
                </div>
              ) : null}
            </Card>

            <Card>
              <SectionTitle
                title={lang === "en" ? "Stock Minimum Thresholds" : "الحدود الدنيا للمخزون"}
                subtitle={lang === "en" ? "Minimum required units for each blood type" : "الحد الأدنى المطلوب لكل فصيلة"}
              />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {data.thresholds.map((tItem) => (
                  <div key={tItem.bloodType} className="rounded-[12px] bg-[var(--bg-elevated)] px-3 py-2 text-center">
                    <p className="text-[14px] font-bold text-ink">{tItem.bloodType}</p>
                    <p className="text-[12px] text-muted">
                      {lang === "en" ? `Min ${tItem.minUnits}` : `الحد ${tItem.minUnits}`}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Blood Bank & Hospital Identity */}
          <Card>
            <SectionTitle
              title={lang === "en" ? "Blood Bank & Facility Identity" : "هوية بنك الدم والمستشفى (التشغيل الخاص)"}
              subtitle={lang === "en" ? "Institution details displayed across reports, exports, and donor app" : "بيانات المنشأة الطبية التي تظهر في الواجهة والتقارير وتطبيق المتبرعين"}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={lang === "en" ? "Blood bank name" : "اسم بنك الدم"}>
                <TextInput value={bank.name} onChange={(name) => setBankDraft((current) => ({ ...(current ?? bank), name }))} />
              </Field>
              <Field label={lang === "en" ? "Hospital / Facility name" : "اسم المستشفى / المؤسسة الصحية"}>
                <TextInput value={bank.hospitalName ?? ""} onChange={(hospitalName) => setBankDraft((current) => ({ ...(current ?? bank), hospitalName }))} />
              </Field>
              <Field label={lang === "en" ? "City / Region" : "المدينة / الولاية"}>
                <TextInput value={bank.city ?? ""} onChange={(city) => setBankDraft((current) => ({ ...(current ?? bank), city }))} />
              </Field>
              <Field label={lang === "en" ? "Contact phone / Emergency hotline" : "هاتف التواصل / خط الطوارئ"}>
                <TextInput type="tel" value={bank.phone} onChange={(phone) => setBankDraft((current) => ({ ...(current ?? bank), phone }))} />
              </Field>
              <Field label={lang === "en" ? "Address and Reception location" : "العنوان وموقع الاستقبال"} className="sm:col-span-2">
                <textarea className="field-input min-h-20" value={bank.address} onChange={(event) => setBankDraft((current) => ({ ...(current ?? bank), address: event.target.value }))} />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {canAccess("settings", "manage") ? (
                <Button onClick={saveBank} disabled={savingBank}>{savingBank ? (lang === "en" ? "Saving..." : "جارٍ الحفظ...") : (lang === "en" ? "Save identity details" : "حفظ بيانات المنشأة")}</Button>
              ) : null}
              {bankMessage ? <p role="status" className="text-sm text-muted">{bankMessage}</p> : null}
            </div>
          </Card>

          {/* Communication Services & Gateways */}
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <SectionTitle
                  title={lang === "en" ? "OTP & Communication Gateways" : "خدمات إرسال رمز التحقق والرسائل (SMS / البريد / واتساب)"}
                  subtitle={
                    lang === "en"
                      ? "Configure live channels to deliver verification codes and alerts via Email SMTP, SMS Gateways, or WhatsApp"
                      : "ربط بوابات الإرسال الحقيقية لتسليم رموز التحقق والإشعارات عبر البريد الإلكتروني، الرسائل النصية، وواتساب"
                  }
                />
              </div>
              <div className="flex items-center gap-2 bg-[var(--bg-elevated)] p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setCommActiveTab("email")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    commActiveTab === "email" ? "bg-brand text-white shadow" : "text-muted hover:text-ink"
                  }`}
                >
                  {lang === "en" ? "Email (SMTP)" : "البريد الإلكتروني"}
                </button>
                <button
                  type="button"
                  onClick={() => setCommActiveTab("sms")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    commActiveTab === "sms" ? "bg-brand text-white shadow" : "text-muted hover:text-ink"
                  }`}
                >
                  {lang === "en" ? "SMS Gateway" : "رسائل SMS"}
                </button>
                <button
                  type="button"
                  onClick={() => setCommActiveTab("whatsapp")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    commActiveTab === "whatsapp" ? "bg-brand text-white shadow" : "text-muted hover:text-ink"
                  }`}
                >
                  {lang === "en" ? "WhatsApp" : "واتساب"}
                </button>
              </div>
            </div>

            {/* TAB 1: EMAIL */}
            {commActiveTab === "email" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-line)]">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {lang === "en" ? "Enable Email Delivery" : "تفعيل الإرسال عبر البريد الإلكتروني"}
                    </p>
                    <p className="text-xs text-muted">
                      {lang === "en" ? "Sends OTP and reports to donor and staff email addresses" : "إرسال رموز التحقق واستعادة كلمة المرور لبريد المستخدمين"}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={comm.emailEnabled}
                      onChange={(e) => setCommDraft((prev) => ({ ...(prev ?? comm), emailEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={lang === "en" ? "Provider Type" : "نوع مزود البريد"}>
                    <select
                      className="field-input"
                      value={comm.emailProvider}
                      onChange={(e) => setCommDraft((prev) => ({ ...(prev ?? comm), emailProvider: e.target.value as "smtp" | "resend" }))}
                    >
                      <option value="smtp">{lang === "en" ? "Standard SMTP Server (Gmail, Outlook, Hospital Mail)" : "خادم بريد SMTP قياسي (Gmail, Outlook, خادم المنشأة)"}</option>
                      <option value="resend">{lang === "en" ? "Resend API (Cloud HTTP)" : "بوابة Resend API السحابية"}</option>
                    </select>
                  </Field>

                  {comm.emailProvider === "resend" ? (
                    <Field label={lang === "en" ? "Resend API Key" : "مفتاح Resend API"}>
                      <TextInput
                        type="password"
                        value={comm.resendApiKey}
                        onChange={(resendApiKey) => setCommDraft((prev) => ({ ...(prev ?? comm), resendApiKey }))}
                        placeholder="re_xxxxxxxxxxxxxx"
                      />
                    </Field>
                  ) : (
                    <>
                      <Field label={lang === "en" ? "SMTP Server Host" : "مضيف خادم البريد (Host)"}>
                        <TextInput
                          value={comm.smtpHost}
                          onChange={(smtpHost) => setCommDraft((prev) => ({ ...(prev ?? comm), smtpHost }))}
                          placeholder="smtp.gmail.com"
                        />
                      </Field>
                      <Field label={lang === "en" ? "SMTP Port" : "منفذ خادم البريد (Port)"}>
                        <TextInput
                          type="number"
                          value={String(comm.smtpPort)}
                          onChange={(smtpPort) => setCommDraft((prev) => ({ ...(prev ?? comm), smtpPort: Number(smtpPort) || 587 }))}
                          placeholder="587"
                        />
                      </Field>
                      <Field label={lang === "en" ? "SMTP Username / Email" : "اسم المستخدم / عنوان البريد"}>
                        <TextInput
                          value={comm.smtpUser}
                          onChange={(smtpUser) => setCommDraft((prev) => ({ ...(prev ?? comm), smtpUser }))}
                          placeholder="bloodbank@example.com"
                        />
                      </Field>
                      <Field label={lang === "en" ? "SMTP Password / App Password" : "كلمة مرور البريد / كلمة مرور التطبيق"}>
                        <TextInput
                          type="password"
                          value={comm.smtpPass}
                          onChange={(smtpPass) => setCommDraft((prev) => ({ ...(prev ?? comm), smtpPass }))}
                          placeholder="••••••••••••"
                        />
                      </Field>
                    </>
                  )}

                  <Field label={lang === "en" ? "From Email Address" : "بريد المرسل الظاهر (From Email)"}>
                    <TextInput
                      value={comm.fromEmail}
                      onChange={(fromEmail) => setCommDraft((prev) => ({ ...(prev ?? comm), fromEmail }))}
                      placeholder="noreply@nafeer.org"
                    />
                  </Field>
                  <Field label={lang === "en" ? "From Name" : "اسم المرسل الظاهر (From Name)"}>
                    <TextInput
                      value={comm.fromName}
                      onChange={(fromName) => setCommDraft((prev) => ({ ...(prev ?? comm), fromName }))}
                      placeholder="بنك الدم المركزي - نفير"
                    />
                  </Field>
                </div>

                {/* Test Email Box */}
                <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-line)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="email"
                      value={testTargetEmail}
                      onChange={(e) => setTestTargetEmail(e.target.value)}
                      placeholder={lang === "en" ? "Test recipient email, e.g. you@gmail.com" : "أدخل بريدك الإلكتروني لاختبار الإرسال"}
                      className="field-input text-sm"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => runTestCommunication("email")}
                    disabled={testingEmail}
                  >
                    {testingEmail ? (lang === "en" ? "Sending Test..." : "جارٍ الإرسال...") : (lang === "en" ? "Send Test Email" : "إرسال بريد تجريبي")}
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 2: SMS GATEWAY */}
            {commActiveTab === "sms" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-line)]">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {lang === "en" ? "Enable SMS Gateway Delivery" : "تفعيل إرسال الرسائل النصية القصيرة (SMS)"}
                    </p>
                    <p className="text-xs text-muted">
                      {lang === "en" ? "Dispatches real OTP SMS messages to donor and staff mobile phones" : "إرسال رسائل SMS فعلية إلى هواتف المتبرعين والطاقم الطبي"}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={comm.smsEnabled}
                      onChange={(e) => setCommDraft((prev) => ({ ...(prev ?? comm), smsEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={lang === "en" ? "SMS Provider Gateway" : "نوع بوابة الرسائل القصيرة"} className="sm:col-span-2">
                    <select
                      className="field-input"
                      value={comm.smsProvider}
                      onChange={(e) => setCommDraft((prev) => ({ ...(prev ?? comm), smsProvider: e.target.value as "twilio" | "custom_http" | "whatsapp" }))}
                    >
                      <option value="twilio">Twilio Global SMS Gateway</option>
                      <option value="custom_http">{lang === "en" ? "Custom HTTP SMS Gateway (Local Providers: Sudan Zain, Sudani, MTN, Taqnyat)" : "بوابة SMS مخصصة عبر HTTP (شركات الاتصالات المحلية: زين، سوداني، إم تي إن، تقنيات)"}</option>
                    </select>
                  </Field>

                  {comm.smsProvider === "twilio" ? (
                    <>
                      <Field label={lang === "en" ? "Twilio Account SID" : "معرف حساب Twilio (Account SID)"}>
                        <TextInput
                          value={comm.twilioAccountSid}
                          onChange={(twilioAccountSid) => setCommDraft((prev) => ({ ...(prev ?? comm), twilioAccountSid }))}
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        />
                      </Field>
                      <Field label={lang === "en" ? "Twilio Auth Token" : "مفتاح المصادقة (Auth Token)"}>
                        <TextInput
                          type="password"
                          value={comm.twilioAuthToken}
                          onChange={(twilioAuthToken) => setCommDraft((prev) => ({ ...(prev ?? comm), twilioAuthToken }))}
                          placeholder="•••••••••••••••••••••••••••••"
                        />
                      </Field>
                      <Field label={lang === "en" ? "Twilio From Phone Number" : "رقم هاتف الإرسال المعتمد (Twilio Phone)"} className="sm:col-span-2">
                        <TextInput
                          value={comm.twilioFromNumber}
                          onChange={(twilioFromNumber) => setCommDraft((prev) => ({ ...(prev ?? comm), twilioFromNumber }))}
                          placeholder="+1xxxxxxxxxx"
                        />
                      </Field>
                    </>
                  ) : (
                    <>
                      <Field label={lang === "en" ? "Gateway API URL" : "رابط استدعاء البوابة (API URL)"} className="sm:col-span-2">
                        <TextInput
                          value={comm.customSmsUrl}
                          onChange={(customSmsUrl) => setCommDraft((prev) => ({ ...(prev ?? comm), customSmsUrl }))}
                          placeholder="https://api.sms-gateway.com/send?to={phone}&message={message}&key={key}"
                        />
                        <p className="text-[11px] text-muted mt-1">
                          {lang === "en"
                            ? "Dynamic tags supported: {phone}, {message}, {key}, {sender}"
                            : "المتغيرات المدعومة في الرابط: {phone} لرقم الهاتف، {message} لنص الرسالة، {key} لمفتاح الربط"}
                        </p>
                      </Field>
                      <Field label={lang === "en" ? "HTTP Method" : "طريقة الطلب"}>
                        <select
                          className="field-input"
                          value={comm.customSmsMethod}
                          onChange={(e) => setCommDraft((prev) => ({ ...(prev ?? comm), customSmsMethod: e.target.value as "GET" | "POST" }))}
                        >
                          <option value="GET">GET Request</option>
                          <option value="POST">POST (JSON Body)</option>
                        </select>
                      </Field>
                      <Field label={lang === "en" ? "Sender ID / Name" : "اسم المرسل المعتمد (Sender ID)"}>
                        <TextInput
                          value={comm.customSmsSenderId}
                          onChange={(customSmsSenderId) => setCommDraft((prev) => ({ ...(prev ?? comm), customSmsSenderId }))}
                          placeholder="NAFEER"
                        />
                      </Field>
                      <Field label={lang === "en" ? "Gateway Secret / API Key" : "مفتاح الربط السري (API Key)"} className="sm:col-span-2">
                        <TextInput
                          type="password"
                          value={comm.customSmsApiKey}
                          onChange={(customSmsApiKey) => setCommDraft((prev) => ({ ...(prev ?? comm), customSmsApiKey }))}
                          placeholder="•••••••••••••••••••••••••••••"
                        />
                      </Field>
                    </>
                  )}
                </div>

                {/* Test SMS Box */}
                <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-line)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="tel"
                      value={testTargetPhone}
                      onChange={(e) => setTestTargetPhone(e.target.value)}
                      placeholder={lang === "en" ? "Test recipient phone, e.g. +249912345678" : "أدخل رقم الهاتف لاختبار الإرسال (مثال: +249...)"}
                      className="field-input text-sm"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => runTestCommunication("sms")}
                    disabled={testingSms}
                  >
                    {testingSms ? (lang === "en" ? "Sending SMS..." : "جارٍ إرسال SMS...") : (lang === "en" ? "Send Test SMS" : "إرسال رسالة SMS تجريبية")}
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 3: WHATSAPP */}
            {commActiveTab === "whatsapp" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-line)]">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {lang === "en" ? "Enable WhatsApp Cloud API" : "تفعيل إرسال الرسائل عبر واتساب (Meta WhatsApp Cloud API)"}
                    </p>
                    <p className="text-xs text-muted">
                      {lang === "en" ? "Dispatches verification OTP and critical emergency appeals via official WhatsApp number" : "إرسال رموز التحقق ونداءات التبرع للمتبرعين مباشرة على تطبيق واتساب"}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={comm.whatsappEnabled}
                      onChange={(e) => setCommDraft((prev) => ({ ...(prev ?? comm), whatsappEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={lang === "en" ? "WhatsApp Phone Number ID" : "معرف رقم هاتف واتساب (Phone Number ID)"}>
                    <TextInput
                      value={comm.whatsappPhoneNumberId}
                      onChange={(whatsappPhoneNumberId) => setCommDraft((prev) => ({ ...(prev ?? comm), whatsappPhoneNumberId }))}
                      placeholder="100000000000000"
                    />
                  </Field>
                  <Field label={lang === "en" ? "WhatsApp System User Access Token" : "رمز الوصول الدائم (System User Token)"}>
                    <TextInput
                      type="password"
                      value={comm.whatsappAccessToken}
                      onChange={(whatsappAccessToken) => setCommDraft((prev) => ({ ...(prev ?? comm), whatsappAccessToken }))}
                      placeholder="EAAGxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                  </Field>
                </div>

                {/* Test WhatsApp Box */}
                <div className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-line)] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="tel"
                      value={testTargetPhone}
                      onChange={(e) => setTestTargetPhone(e.target.value)}
                      placeholder={lang === "en" ? "Target WhatsApp phone, e.g. +249912345678" : "أدخل رقم واتساب لاختبار الإرسال (مثال: +249...)"}
                      className="field-input text-sm"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => runTestCommunication("whatsapp")}
                    disabled={testingWa}
                  >
                    {testingWa ? (lang === "en" ? "Sending WhatsApp..." : "جارٍ الإرسال عبر واتساب...") : (lang === "en" ? "Send Test WhatsApp" : "إرسال رسالة واتساب تجريبية")}
                  </Button>
                </div>
              </div>
            )}

            {/* Test result feedback alert */}
            {testResult && (
              <div className={`mt-3 p-3 rounded-xl border text-sm font-medium ${
                testResult.ok
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200"
                  : "bg-red-500/10 border-red-500/30 text-red-800 dark:text-red-200"
              }`}>
                {testResult.msg}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {canAccess("settings", "manage") ? (
                <Button onClick={saveComm} disabled={savingComm}>
                  {savingComm ? (lang === "en" ? "Saving..." : "جارٍ الحفظ...") : (lang === "en" ? "Save Communication Settings" : "حفظ إعدادات بوابات الإرسال")}
                </Button>
              ) : null}
              {commMessage ? <p role="status" className="text-sm text-muted">{commMessage}</p> : null}
            </div>
          </Card>

          {/* Backup & Database Info */}
          <Card>
            <SectionTitle title={lang === "en" ? "Backup & Database" : "النسخ الاحتياطي وقاعدة البيانات"} />
            <div className="space-y-2 text-[13px] leading-relaxed text-muted">
              <p>
                <Badge tone="info">{lang === "en" ? "Persistent Production Storage" : "تخزين دائم على السحابة"}</Badge> SQLite Volume.
              </p>
              <pre dir="ltr" className="overflow-x-auto rounded-[12px] bg-[var(--bg-elevated)] p-3 text-[12px] text-ink">
{`# Storage Mount Path: /app/data/blood-bank-live.db`}
              </pre>
              <p className="text-[12px]">
                {lang === "en" ? "Last status update:" : "آخر تحديث للحالة:"} {new Date(data.status.lastUpdate).toLocaleString(lang === "en" ? "en-US" : "ar")}
              </p>
            </div>
          </Card>

          {/* System Reset */}
          {canAccess("settings", "manage") ? (
            <Card className="border border-red-500/30 bg-red-50/50 dark:bg-red-950/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <SectionTitle
                    title={lang === "en" ? "System Re-initialization (Fresh Start)" : "إعادة تهيئة النظام (البداية من جديد)"}
                    subtitle={
                      lang === "en"
                        ? "Reset the system back to the initial setup state (/setup) to configure super admin from scratch."
                        : "مسح البيانات وإعادة النظام إلى وضع الإعداد الأولي (/setup) لتهيئة حساب المدير الأول من البداية."
                    }
                  />
                  <p className="mt-1 text-[13px] text-muted">
                    {lang === "en"
                      ? "Use this option to experience the system from initial first-time onboarding to daily live operations."
                      : "استخدم هذا الخيار للبدء من جديد من مرحلة تهيئة مدير النظام وحسابات الموظفين."}
                  </p>
                </div>
                <div>
                  <Button
                    variant="danger"
                    onClick={() => {
                      setResetConfirmText("");
                      setResetError("");
                      setResetConfirmOpen(true);
                    }}
                  >
                    {lang === "en" ? "Re-initialize System" : "إعادة تهيئة النظام كبداية جديدة"}
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          {resetConfirmOpen ? (
            <Modal
              open={resetConfirmOpen}
              onClose={() => setResetConfirmOpen(false)}
              title={lang === "en" ? "Confirm System Re-initialization" : "تأكيد إعادة تهيئة النظام"}
              description={
                lang === "en"
                  ? "This will clear all records and return you to the initial setup wizard (/setup)."
                  : "سيتم مسح كافة السجلات والمستخدمين وتحويلك فوراً لصفحة الإعداد الأولي (/setup) لإنشاء حساب المدير."
              }
              footer={
                <>
                  <Button variant="secondary" onClick={() => setResetConfirmOpen(false)} disabled={resettingSystem}>
                    {lang === "en" ? "Cancel" : "إلغاء"}
                  </Button>
                  <Button variant="danger" onClick={handleResetSystem} disabled={resettingSystem}>
                    {resettingSystem ? (lang === "en" ? "Resetting..." : "جارٍ إعادة التهيئة...") : (lang === "en" ? "Confirm & Reset" : "تأكيد والبدء من جديد")}
                  </Button>
                </>
              }
            >
              <div className="space-y-4">
                <p className="text-sm text-ink leading-relaxed">
                  {lang === "en"
                    ? "To confirm this action, please type RESET in the box below:"
                    : "لتأكيد هذه العملية والبدء من جديد، يرجى كتابة RESET في المربع أدناه:"}
                </p>
                <TextInput
                  value={resetConfirmText}
                  onChange={setResetConfirmText}
                  placeholder="RESET"
                />
                {resetError ? <p className="text-sm text-red-600">{resetError}</p> : null}
              </div>
            </Modal>
          ) : null}
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-1.5 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
