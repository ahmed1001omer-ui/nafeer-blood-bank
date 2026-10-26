import { db } from "@/db";
import {
  auditLogs,
  blacklist,
  bloodIssues,
  bloodRequests,
  bloodUnits,
  donations,
  donationPosts,
  donors,
  employees,
  inventoryMovements,
  labTests,
  mobileUsers,
  patients,
  postResponses,
  users,
} from "@/db/schema";
import { destroySession } from "@/lib/auth";
import { errorResponse, requirePermission } from "@/lib/server-guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await requirePermission("settings", "manage");
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const confirmText = String(body.confirmText ?? "").trim();

    if (confirmText !== "RESET" && confirmText !== "إعادة تهيئة") {
      return Response.json(
        { message: "يرجى كتابة كلمة التأكيد لإعادة تهيئة النظام" },
        { status: 400 }
      );
    }

    // 1. مسح كافة البيانات التشغيلية
    await db.delete(postResponses);
    await db.delete(donationPosts);
    await db.delete(bloodIssues);
    await db.delete(bloodRequests);
    await db.delete(inventoryMovements);
    await db.delete(bloodUnits);
    await db.delete(donations);
    await db.delete(labTests);
    await db.delete(blacklist);
    await db.delete(patients);
    await db.delete(donors);
    await db.delete(employees);
    await db.delete(mobileUsers);
    await db.delete(auditLogs);

    // 2. مسح المستخدمين حتى يعود النظام لحالة الإعداد الأولي (/setup)
    await db.delete(users);

    // 3. إنهاء الجلسة الحالية
    await destroySession();

    return Response.json({
      success: true,
      message: "تمت إعادة تهيئة النظام بنجاح. سيتم توجيهك الآن لصفحة إعداد مدير النظام الجديد.",
      redirectTo: "/setup",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
