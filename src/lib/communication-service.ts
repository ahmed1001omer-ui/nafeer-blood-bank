import "server-only";
import * as net from "node:net";
import * as tls from "node:tls";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";

export type CommunicationSettings = {
  // Email (SMTP & APIs)
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

  // SMS Gateway
  smsEnabled: boolean;
  smsProvider: "twilio" | "custom_http" | "whatsapp";
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromNumber: string;
  customSmsUrl: string; // e.g. https://sms-gateway.com/api?to={phone}&msg={message}&key={key}
  customSmsMethod: "GET" | "POST";
  customSmsApiKey: string;
  customSmsSenderId: string;

  // WhatsApp Cloud API
  whatsappEnabled: boolean;
  whatsappPhoneNumberId: string;
  whatsappAccessToken: string;
};

export const COMMUNICATION_SETTINGS_KEY = "communication_settings";

export const DEFAULT_COMMUNICATION_SETTINGS: CommunicationSettings = {
  emailEnabled: false,
  emailProvider: "smtp",
  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  fromEmail: process.env.SMTP_FROM || process.env.FROM_EMAIL || "noreply@nafeer.org",
  fromName: "بنك الدم المركزي - نفير",

  smsEnabled: false,
  smsProvider: "twilio",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER || "",
  customSmsUrl: process.env.SMS_GATEWAY_URL || "",
  customSmsMethod: "GET",
  customSmsApiKey: process.env.SMS_GATEWAY_KEY || "",
  customSmsSenderId: process.env.SMS_SENDER_ID || "NAFEER",

  whatsappEnabled: false,
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_ID || "",
  whatsappAccessToken: process.env.WHATSAPP_TOKEN || "",
};

export async function getCommunicationSettings(): Promise<CommunicationSettings> {
  try {
    const [row] = await db
      .select({ value: systemSettings.value })
      .from(systemSettings)
      .where(eq(systemSettings.key, COMMUNICATION_SETTINGS_KEY));

    const value = row?.value;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ...DEFAULT_COMMUNICATION_SETTINGS };
    }

    const d = value as Record<string, unknown>;
    return {
      emailEnabled: typeof d.emailEnabled === "boolean" ? d.emailEnabled : DEFAULT_COMMUNICATION_SETTINGS.emailEnabled,
      emailProvider: d.emailProvider === "resend" ? "resend" : "smtp",
      smtpHost: typeof d.smtpHost === "string" ? d.smtpHost.trim() : DEFAULT_COMMUNICATION_SETTINGS.smtpHost,
      smtpPort: typeof d.smtpPort === "number" ? d.smtpPort : DEFAULT_COMMUNICATION_SETTINGS.smtpPort,
      smtpSecure: typeof d.smtpSecure === "boolean" ? d.smtpSecure : DEFAULT_COMMUNICATION_SETTINGS.smtpSecure,
      smtpUser: typeof d.smtpUser === "string" ? d.smtpUser.trim() : DEFAULT_COMMUNICATION_SETTINGS.smtpUser,
      smtpPass: typeof d.smtpPass === "string" ? d.smtpPass : DEFAULT_COMMUNICATION_SETTINGS.smtpPass,
      resendApiKey: typeof d.resendApiKey === "string" ? d.resendApiKey.trim() : DEFAULT_COMMUNICATION_SETTINGS.resendApiKey,
      fromEmail: typeof d.fromEmail === "string" ? d.fromEmail.trim() : DEFAULT_COMMUNICATION_SETTINGS.fromEmail,
      fromName: typeof d.fromName === "string" ? d.fromName.trim() : DEFAULT_COMMUNICATION_SETTINGS.fromName,

      smsEnabled: typeof d.smsEnabled === "boolean" ? d.smsEnabled : DEFAULT_COMMUNICATION_SETTINGS.smsEnabled,
      smsProvider: d.smsProvider === "custom_http" || d.smsProvider === "whatsapp" ? d.smsProvider : "twilio",
      twilioAccountSid: typeof d.twilioAccountSid === "string" ? d.twilioAccountSid.trim() : DEFAULT_COMMUNICATION_SETTINGS.twilioAccountSid,
      twilioAuthToken: typeof d.twilioAuthToken === "string" ? d.twilioAuthToken : DEFAULT_COMMUNICATION_SETTINGS.twilioAuthToken,
      twilioFromNumber: typeof d.twilioFromNumber === "string" ? d.twilioFromNumber.trim() : DEFAULT_COMMUNICATION_SETTINGS.twilioFromNumber,
      customSmsUrl: typeof d.customSmsUrl === "string" ? d.customSmsUrl.trim() : DEFAULT_COMMUNICATION_SETTINGS.customSmsUrl,
      customSmsMethod: d.customSmsMethod === "POST" ? "POST" : "GET",
      customSmsApiKey: typeof d.customSmsApiKey === "string" ? d.customSmsApiKey : DEFAULT_COMMUNICATION_SETTINGS.customSmsApiKey,
      customSmsSenderId: typeof d.customSmsSenderId === "string" ? d.customSmsSenderId.trim() : DEFAULT_COMMUNICATION_SETTINGS.customSmsSenderId,

      whatsappEnabled: typeof d.whatsappEnabled === "boolean" ? d.whatsappEnabled : DEFAULT_COMMUNICATION_SETTINGS.whatsappEnabled,
      whatsappPhoneNumberId: typeof d.whatsappPhoneNumberId === "string" ? d.whatsappPhoneNumberId.trim() : DEFAULT_COMMUNICATION_SETTINGS.whatsappPhoneNumberId,
      whatsappAccessToken: typeof d.whatsappAccessToken === "string" ? d.whatsappAccessToken : DEFAULT_COMMUNICATION_SETTINGS.whatsappAccessToken,
    };
  } catch {
    return { ...DEFAULT_COMMUNICATION_SETTINGS };
  }
}

export function maskSecret(val: string): string {
  if (!val) return "";
  if (val.length <= 4) return "••••";
  return val.slice(0, 2) + "••••••••" + val.slice(-2);
}

export function getMaskedCommunicationSettings(s: CommunicationSettings) {
  return {
    ...s,
    smtpPass: s.smtpPass ? "••••••••" : "",
    resendApiKey: maskSecret(s.resendApiKey),
    twilioAuthToken: maskSecret(s.twilioAuthToken),
    customSmsApiKey: maskSecret(s.customSmsApiKey),
    whatsappAccessToken: maskSecret(s.whatsappAccessToken),
  };
}

// ---------------------------------------------------------------------
// Native Node.js SMTP Client (Zero External Dependencies)
// ---------------------------------------------------------------------
function sendNativeSmtp({
  host,
  port,
  secure,
  user,
  pass,
  from,
  to,
  subject,
  html,
  text,
}: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    let socket: net.Socket | tls.TLSSocket;
    let step = 0;
    let buffer = "";

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("انتهت مهلة الاتصال بخادم البريد SMTP"));
    }, 12000);

    function cleanup() {
      clearTimeout(timeout);
      if (socket) {
        socket.removeAllListeners();
        socket.destroy();
      }
    }

    function sendCmd(cmd: string) {
      if (socket && socket.writable) {
        socket.write(cmd + "\r\n");
      }
    }

    function onData(chunk: Buffer) {
      buffer += chunk.toString();
      const lines = buffer.split("\r\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line) continue;
        const code = parseInt(line.slice(0, 3), 10);
        const isFinal = line.charAt(3) === " ";
        if (!isFinal) continue; // Multi-line response like 250-SIZE

        if (code >= 400) {
          cleanup();
          return reject(new Error(`SMTP Error (${code}): ${line.slice(4)}`));
        }

        handleStep(code);
      }
    }

    function handleStep(code: number) {
      switch (step) {
        case 0: // 220 Greeting
          step = 1;
          sendCmd("EHLO localhost");
          break;
        case 1: // 250 EHLO response
          if (port === 587 && !secure) {
            step = 2;
            sendCmd("STARTTLS");
          } else {
            step = 4;
            sendCmd("AUTH LOGIN");
          }
          break;
        case 2: // 220 Ready for TLS
          step = 3;
          socket.removeAllListeners("data");
          const tlsSocket = tls.connect({
            socket: socket as net.Socket,
            host,
            rejectUnauthorized: false,
          });
          socket = tlsSocket;
          socket.on("data", onData);
          socket.on("error", (err) => { cleanup(); reject(err); });
          sendCmd("EHLO localhost");
          break;
        case 3: // 250 EHLO after TLS
          step = 4;
          sendCmd("AUTH LOGIN");
          break;
        case 4: // 334 Username challenge
          step = 5;
          sendCmd(Buffer.from(user).toString("base64"));
          break;
        case 5: // 334 Password challenge
          step = 6;
          sendCmd(Buffer.from(pass).toString("base64"));
          break;
        case 6: // 235 Authentication successful
          step = 7;
          sendCmd(`MAIL FROM:<${user}>`);
          break;
        case 7: // 250 Sender accepted
          step = 8;
          sendCmd(`RCPT TO:<${to}>`);
          break;
        case 8: // 250 Recipient accepted
          step = 9;
          sendCmd("DATA");
          break;
        case 9: // 354 Start mail input
          step = 10;
          const boundary = "bnd_" + Date.now();
          const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`;
          const emailMessage = [
            `From: ${from}`,
            `To: ${to}`,
            `Subject: ${encodedSubject}`,
            "MIME-Version: 1.0",
            `Content-Type: multipart/alternative; boundary="${boundary}"`,
            "",
            `--${boundary}`,
            "Content-Type: text/plain; charset=UTF-8",
            "Content-Transfer-Encoding: base64",
            "",
            Buffer.from(text).toString("base64"),
            "",
            `--${boundary}`,
            "Content-Type: text/html; charset=UTF-8",
            "Content-Transfer-Encoding: base64",
            "",
            Buffer.from(html).toString("base64"),
            "",
            `--${boundary}--`,
            ".",
          ].join("\r\n");
          socket.write(emailMessage + "\r\n");
          break;
        case 10: // 250 Message queued
          step = 11;
          sendCmd("QUIT");
          cleanup();
          resolve();
          break;
      }
    }

    try {
      if (secure || port === 465) {
        socket = tls.connect({ host, port, rejectUnauthorized: false });
      } else {
        socket = net.connect({ host, port });
      }

      socket.on("data", onData);
      socket.on("error", (err) => {
        cleanup();
        reject(err);
      });
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}

// ---------------------------------------------------------------------
// 1. Send Email (Native SMTP or Resend API)
// ---------------------------------------------------------------------
export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getCommunicationSettings();
  if (!cfg.emailEnabled) {
    return { ok: false, error: "خدمة البريد الإلكتروني غير مفعلة في الإعدادات" };
  }

  // A. Resend HTTP API
  if (cfg.emailProvider === "resend") {
    if (!cfg.resendApiKey) {
      return { ok: false, error: "مفتاح Resend API غير مدخل" };
    }
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.resendApiKey}`,
        },
        body: JSON.stringify({
          from: `${cfg.fromName} <${cfg.fromEmail}>`,
          to: [to],
          subject,
          html,
          text: text || html.replace(/<[^>]+>/g, ""),
        }),
      });
      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        return { ok: false, error: String(errJson.message || `Resend Error ${res.status}`) };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "خطأ أثناء إرسال البريد عبر Resend" };
    }
  }

  // B. Native SMTP
  if (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPass) {
    return { ok: false, error: "بيانات خادم البريد SMTP غير مكتملة (المضيف، اسم المستخدم، أو كلمة المرور)" };
  }

  try {
    await sendNativeSmtp({
      host: cfg.smtpHost,
      port: cfg.smtpPort,
      secure: cfg.smtpSecure,
      user: cfg.smtpUser,
      pass: cfg.smtpPass,
      from: `"${cfg.fromName}" <${cfg.fromEmail || cfg.smtpUser}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ""),
    });
    return { ok: true };
  } catch (e) {
    console.error("[EMAIL SMTP ERROR]:", e);
    return { ok: false, error: e instanceof Error ? e.message : "تعذر الاتصال بخادم البريد SMTP" };
  }
}

// ---------------------------------------------------------------------
// 2. Send SMS (Twilio or Custom HTTP Gateway)
// ---------------------------------------------------------------------
export async function sendSms({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getCommunicationSettings();
  if (!cfg.smsEnabled) {
    return { ok: false, error: "خدمة الرسائل النصية SMS غير مفعلة في الإعدادات" };
  }

  // A. Twilio SMS
  if (cfg.smsProvider === "twilio") {
    if (!cfg.twilioAccountSid || !cfg.twilioAuthToken || !cfg.twilioFromNumber) {
      return { ok: false, error: "بيانات Twilio غير مكتملة (Account SID, Auth Token, From Number)" };
    }

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${cfg.twilioAccountSid}/Messages.json`;
      const basicAuth = Buffer.from(`${cfg.twilioAccountSid}:${cfg.twilioAuthToken}`).toString("base64");

      const params = new URLSearchParams();
      params.append("To", to);
      params.append("From", cfg.twilioFromNumber);
      params.append("Body", message);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${basicAuth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        return { ok: false, error: String(errJson.message || `Twilio Error ${res.status}`) };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "خطأ أثناء الاتصال بـ Twilio" };
    }
  }

  // B. Custom HTTP SMS Gateway (Sudan providers, Taqnyat, Infobip, etc.)
  if (cfg.smsProvider === "custom_http") {
    if (!cfg.customSmsUrl) {
      return { ok: false, error: "رابط بوابة الرسائل النصية غير محدد" };
    }

    try {
      const formattedTo = encodeURIComponent(to);
      const formattedMsg = encodeURIComponent(message);
      const formattedKey = encodeURIComponent(cfg.customSmsApiKey || "");
      const formattedSender = encodeURIComponent(cfg.customSmsSenderId || "NAFEER");

      const targetUrl = cfg.customSmsUrl
        .replace(/\{phone\}/g, formattedTo)
        .replace(/\{to\}/g, formattedTo)
        .replace(/\{message\}/g, formattedMsg)
        .replace(/\{msg\}/g, formattedMsg)
        .replace(/\{text\}/g, formattedMsg)
        .replace(/\{key\}/g, formattedKey)
        .replace(/\{apiKey\}/g, formattedKey)
        .replace(/\{sender\}/g, formattedSender);

      if (cfg.customSmsMethod === "POST") {
        const res = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to,
            message,
            apiKey: cfg.customSmsApiKey,
            sender: cfg.customSmsSenderId,
          }),
        });
        if (!res.ok) {
          return { ok: false, error: `استجابة غير ناجحة من بوابة الرسائل (${res.status})` };
        }
      } else {
        const res = await fetch(targetUrl, { method: "GET" });
        if (!res.ok) {
          return { ok: false, error: `استجابة غير ناجحة من بوابة الرسائل (${res.status})` };
        }
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "خطأ أثناء إرسال الرسالة عبر بوابة SMS" };
    }
  }

  // C. WhatsApp Cloud API fallback if selected as SMS provider
  if (cfg.smsProvider === "whatsapp") {
    return sendWhatsApp({ to, message });
  }

  return { ok: false, error: "مزود الرسائل النصية غير معروف" };
}

// ---------------------------------------------------------------------
// 3. Send WhatsApp Message (Meta Graph API)
// ---------------------------------------------------------------------
export async function sendWhatsApp({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getCommunicationSettings();
  if (!cfg.whatsappEnabled && cfg.smsProvider !== "whatsapp") {
    return { ok: false, error: "خدمة واتساب غير مفعلة في الإعدادات" };
  }

  if (!cfg.whatsappPhoneNumberId || !cfg.whatsappAccessToken) {
    return { ok: false, error: "بيانات WhatsApp Cloud API غير مكتملة (Phone ID أو Access Token)" };
  }

  try {
    const cleanPhone = to.replace(/\D/g, "");
    const url = `https://graph.facebook.com/v21.0/${cfg.whatsappPhoneNumberId}/messages`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.whatsappAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanPhone,
        type: "text",
        text: { preview_url: false, body: message },
      }),
    });

    if (!res.ok) {
      const errJson = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      return { ok: false, error: String((errJson.error as Record<string, unknown>)?.message || `WhatsApp Error ${res.status}`) };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "خطأ أثناء إرسال رسالة واتساب" };
  }
}

// ---------------------------------------------------------------------
// 4. Unified Verification OTP Sender (Dispatches via Email + SMS/WhatsApp)
// ---------------------------------------------------------------------
export async function dispatchVerificationOtp({
  code,
  email,
  phone,
  username,
}: {
  code: string;
  email?: string | null;
  phone?: string | null;
  username?: string | null;
}): Promise<{
  delivered: boolean;
  channels: string[];
  notes: string[];
}> {
  const cfg = await getCommunicationSettings();
  const channels: string[] = [];
  const notes: string[] = [];

  const recipientLabel = username || email || phone || "المستخدم";

  // 1. Send Email if email is available and enabled
  if (email && cfg.emailEnabled) {
    const subject = `رمز التحقق الخاص بك: ${code} - بنك الدم المركزي`;
    const html = `
      <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
        <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; width: 48px; height: 48px; background: #fee2e2; border-radius: 50%; line-height: 48px; font-size: 24px; color: #dc2626; font-weight: bold;">
              BB
            </div>
            <h2 style="color: #0f172a; margin-top: 12px; margin-bottom: 4px;">بنك الدم المركزي - نفير</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">طلب إعادة تعيين كلمة المرور</p>
          </div>
          <p style="font-size: 15px; line-height: 1.6;">مرحباً <strong>${recipientLabel}</strong>،</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">تلقينا طلباً لاستعادة كلمة المرور الخاصة بحسابك. استخدم رمز التحقق التالي لإكمال العملية:</p>
          <div style="text-align: center; margin: 28px 0;">
            <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: monospace; color: #dc2626; background: #fef2f2; border: 2px dashed #fca5a5; padding: 12px 28px; border-radius: 12px;">
              ${code}
            </span>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5; text-align: center;">صلاحية هذا الرمز هي 15 دقيقة فقط للاستخدام لمرة واحدة. إذا لم تكن أنت من طلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center; margin: 0;">نظام إدارة بنك الدم الذكي - نفير</p>
        </div>
      </div>
    `;

    const emailRes = await sendEmail({ to: email, subject, html });
    if (emailRes.ok) {
      channels.push("البريد الإلكتروني");
      notes.push(`تم إرسال الرمز بنجاح إلى البريد: ${email}`);
    } else {
      notes.push(`تعذر الإرسال عبر البريد (${emailRes.error})`);
    }
  }

  // 2. Send SMS if phone is available and SMS is enabled
  if (phone && cfg.smsEnabled) {
    const message = `رمز التحقق الخاص بك في بنك الدم هو: ${code}. صالح لمدة 15 دقيقة.`;
    const smsRes = await sendSms({ to: phone, message });
    if (smsRes.ok) {
      channels.push("رسالة نصية SMS");
      notes.push(`تم إرسال الرسالة النصية بنجاح إلى الرقم: ${phone}`);
    } else {
      notes.push(`تعذر الإرسال عبر SMS (${smsRes.error})`);
    }
  }

  // 3. Send WhatsApp if phone is available and WhatsApp is enabled
  if (phone && cfg.whatsappEnabled && cfg.smsProvider !== "whatsapp") {
    const message = `رمز التحقق الخاص بك في نظام بنك الدم المركزي (نفير) هو:\n*${code}*\nصلاحية الرمز: 15 دقيقة.`;
    const waRes = await sendWhatsApp({ to: phone, message });
    if (waRes.ok) {
      channels.push("واتساب WhatsApp");
      notes.push(`تم إرسال الرمز بنجاح عبر تطبيق واتساب إلى الرقم: ${phone}`);
    } else {
      notes.push(`تعذر الإرسال عبر واتساب (${waRes.error})`);
    }
  }

  return {
    delivered: channels.length > 0,
    channels,
    notes,
  };
}
