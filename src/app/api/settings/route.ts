import { db } from "@/db";
import { auditLogs, bloodUnits, inventoryThresholds, systemSettings } from "@/db/schema";
import { BLOOD_BANK_SETTINGS_KEY, getBloodBankSettings } from "@/lib/blood-bank-settings";
import {
  COMMUNICATION_SETTINGS_KEY,
  getCommunicationSettings,
  getMaskedCommunicationSettings,
} from "@/lib/communication-service";
import { clientIp, errorResponse, requirePermission, writeAudit } from "@/lib/server-guard";
import { sql } from "drizzle-orm";
import { todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission("settings", "view");

    let dbOk = true;
    try {
      await db.run(sql`select 1`);
    } catch {
      dbOk = false;
    }

    const today = todayISO();
    const [thresholds, units, logs, bloodBank, commSettings] = await Promise.all([
      db.select().from(inventoryThresholds),
      db.select().from(bloodUnits),
      db.select().from(auditLogs),
      getBloodBankSettings(),
      getCommunicationSettings(),
    ]);

    const opsToday = logs.filter((l) => l.createdAt.toString().slice(0, 10) === today).length;

    return Response.json({
      status: {
        database: dbOk ? "متصلة" : "غير متصلة",
        api: "يعمل",
        system: dbOk ? "سليم" : "يوجد خلل",
        lastUpdate: new Date().toISOString(),
        operationsToday: opsToday,
        totalUnits: units.reduce((s, u) => s + u.quantity, 0),
      },
      thresholds: thresholds.sort((a, b) => a.bloodType.localeCompare(b.bloodType)),
      bloodBank,
      communication: getMaskedCommunicationSettings(commSettings),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("settings", "manage");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    // التعامل مع إعدادات الرسائل والبريد
    if (body.target === "communication" || body.communication) {
      const commData = ((body.communication || body) as Record<string, unknown>);
      const existing = await getCommunicationSettings();

      const smsProvider: "twilio" | "custom_http" | "whatsapp" =
        commData.smsProvider === "custom_http"
          ? "custom_http"
          : commData.smsProvider === "whatsapp"
          ? "whatsapp"
          : "twilio";

      const emailProvider: "smtp" | "resend" =
        commData.emailProvider === "resend" ? "resend" : "smtp";

      const customSmsMethod: "GET" | "POST" =
        commData.customSmsMethod === "POST" ? "POST" : "GET";

      const newSettings = {
        emailEnabled: Boolean(commData.emailEnabled),
        emailProvider,
        smtpHost: typeof commData.smtpHost === "string" ? commData.smtpHost.trim() : existing.smtpHost,
        smtpPort: Number(commData.smtpPort) || existing.smtpPort,
        smtpSecure: Boolean(commData.smtpSecure),
        smtpUser: typeof commData.smtpUser === "string" ? commData.smtpUser.trim() : existing.smtpUser,
        smtpPass: typeof commData.smtpPass === "string" && !commData.smtpPass.includes("••••") ? commData.smtpPass : existing.smtpPass,
        resendApiKey: typeof commData.resendApiKey === "string" && !commData.resendApiKey.includes("••••") ? commData.resendApiKey.trim() : existing.resendApiKey,
        fromEmail: typeof commData.fromEmail === "string" ? commData.fromEmail.trim() : existing.fromEmail,
        fromName: typeof commData.fromName === "string" ? commData.fromName.trim() : existing.fromName,

        smsEnabled: Boolean(commData.smsEnabled),
        smsProvider,
        twilioAccountSid: typeof commData.twilioAccountSid === "string" && !commData.twilioAccountSid.includes("••••") ? commData.twilioAccountSid.trim() : existing.twilioAccountSid,
        twilioAuthToken: typeof commData.twilioAuthToken === "string" && !commData.twilioAuthToken.includes("••••") ? commData.twilioAuthToken : existing.twilioAuthToken,
        twilioFromNumber: typeof commData.twilioFromNumber === "string" ? commData.twilioFromNumber.trim() : existing.twilioFromNumber,
        customSmsUrl: typeof commData.customSmsUrl === "string" ? commData.customSmsUrl.trim() : existing.customSmsUrl,
        customSmsMethod,
        customSmsApiKey: typeof commData.customSmsApiKey === "string" && !commData.customSmsApiKey.includes("••••") ? commData.customSmsApiKey : existing.customSmsApiKey,
        customSmsSenderId: typeof commData.customSmsSenderId === "string" ? commData.customSmsSenderId.trim() : existing.customSmsSenderId,

        whatsappEnabled: Boolean(commData.whatsappEnabled),
        whatsappPhoneNumberId: typeof commData.whatsappPhoneNumberId === "string" ? commData.whatsappPhoneNumberId.trim() : existing.whatsappPhoneNumberId,
        whatsappAccessToken: typeof commData.whatsappAccessToken === "string" && !commData.whatsappAccessToken.includes("••••") ? commData.whatsappAccessToken : existing.whatsappAccessToken,
      };

      await db.insert(systemSettings).values({ key: COMMUNICATION_SETTINGS_KEY, value: newSettings })
        .onConflictDoUpdate({ target: systemSettings.key, set: { value: newSettings, updatedAt: new Date() } });

      await writeAudit({ user, action: "update", entity: "system_settings", entityId: COMMUNICATION_SETTINGS_KEY, page: "/settings", ip: clientIp(request) });
      return Response.json({ communication: getMaskedCommunicationSettings(newSettings) });
    }

    // التعامل مع إعدادات بنك الدم
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const hospitalName = typeof body.hospitalName === "string" ? body.hospitalName.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const errors: Record<string, string> = {};
    if (!name) errors.name = "اسم بنك الدم مطلوب";
    if (!hospitalName) errors.hospitalName = "اسم المستشفى مطلوب";
    if (!address) errors.address = "عنوان بنك الدم مطلوب";
    if (name.length > 160) errors.name = "اسم بنك الدم طويل جدًا";
    if (hospitalName.length > 160) errors.hospitalName = "اسم المستشفى طويل جدًا";
    if (city.length > 100) errors.city = "اسم المدينة طويل جدًا";
    if (address.length > 500) errors.address = "العنوان طويل جدًا";
    if (phone.length > 40) errors.phone = "رقم الهاتف طويل جدًا";
    if (Object.keys(errors).length) return Response.json({ message: "يرجى تصحيح البيانات", errors }, { status: 400 });

    const value = { name, hospitalName, city, address, phone };
    await db.insert(systemSettings).values({ key: BLOOD_BANK_SETTINGS_KEY, value })
      .onConflictDoUpdate({ target: systemSettings.key, set: { value, updatedAt: new Date() } });
    await writeAudit({ user, action: "update", entity: "system_settings", entityId: BLOOD_BANK_SETTINGS_KEY, page: "/settings", ip: clientIp(request) });
    return Response.json({ bloodBank: value });
  } catch (error) {
    return errorResponse(error);
  }
}
