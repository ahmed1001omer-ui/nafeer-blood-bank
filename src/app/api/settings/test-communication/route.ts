import { requirePermission } from "@/lib/server-guard";
import { sendEmail, sendSms, sendWhatsApp } from "@/lib/communication-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requirePermission("settings", "manage");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const type = typeof body.type === "string" ? body.type : "";
    const target = typeof body.target === "string" ? body.target.trim() : "";

    if (!target) {
      return Response.json({ ok: false, message: "يرجى تحديد البريد الإلكتروني أو رقم الهاتف المستهدف للتجربة" }, { status: 400 });
    }

    if (type === "email") {
      const res = await sendEmail({
        to: target,
        subject: "رسالة تجريبية - نظام بنك الدم المركزي (نفير)",
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #dc2626;">اختبار نجاح إرسال البريد الإلكتروني</h2>
            <p>هذه رسالة اختبارية لتأكيد نجاح ربط خادم البريد SMTP مع نظام إدارة بنك الدم المركزي.</p>
            <p><strong>تاريخ وتوقيت الاختبار:</strong> ${new Date().toLocaleString("ar-SD")}</p>
          </div>
        `,
      });
      if (res.ok) {
        return Response.json({ ok: true, message: `تم إرسال بريد تجريبي بنجاح إلى ${target}` });
      }
      return Response.json({ ok: false, message: res.error || "فشل إرسال البريد الإلكتروني" }, { status: 400 });
    }

    if (type === "sms") {
      const res = await sendSms({
        to: target,
        message: `رسالة تجريبية من نظام بنك الدم المركزي (نفير) لتأكيد نجاح ربط بوابة الرسائل النصية. التوقيت: ${new Date().toLocaleTimeString("ar-SD")}`,
      });
      if (res.ok) {
        return Response.json({ ok: true, message: `تم إرسال رسالة SMS تجريبية بنجاح إلى ${target}` });
      }
      return Response.json({ ok: false, message: res.error || "فشل إرسال الرسالة النصية" }, { status: 400 });
    }

    if (type === "whatsapp") {
      const res = await sendWhatsApp({
        to: target,
        message: `رسالة تجريبية عبر واتساب من نظام بنك الدم المركزي (نفير) لتأكيد نجاح ربط WhatsApp Cloud API.\nالتوقيت: ${new Date().toLocaleTimeString("ar-SD")}`,
      });
      if (res.ok) {
        return Response.json({ ok: true, message: `تم إرسال رسالة واتساب تجريبية بنجاح إلى ${target}` });
      }
      return Response.json({ ok: false, message: res.error || "فشل إرسال رسالة واتساب" }, { status: 400 });
    }

    return Response.json({ ok: false, message: "نوع وسيلة الإرسال غير محدد (email, sms, whatsapp)" }, { status: 400 });
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error ? error.message : "حدث خطأ أثناء إجراء الاختبار" }, { status: 500 });
  }
}
