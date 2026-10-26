import { db } from "@/db";
import { donationPosts } from "@/db/schema";
import { requireDate, requireNumber, requireOption, requireText, optionalText } from "@/lib/validation";
import { BLOOD_COMPONENTS, BLOOD_TYPES, URGENCY_OPTIONS } from "@/lib/constants";
import { desc } from "drizzle-orm";
import { clientIp, errorResponse, requirePermission, writeAudit } from "@/lib/server-guard";
import { isInternetAvailable } from "@/lib/network";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requirePermission("posts", "view");
    const rows = await db.select().from(donationPosts).orderBy(desc(donationPosts.id));
    return Response.json({ posts: rows });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("posts", "publish");

    // التحقق الصارم من توفر اتصال بالإنترنت لتسليم المنشور مباشرة إلى تطبيق الهواتف
    const online = await isInternetAvailable(2500);
    if (!online) {
      return Response.json(
        {
          ok: false,
          online: false,
          requiresInternet: true,
          message: "يتطلب إرسال المنشور توفر اتصال نشط بالإنترنت لتسليمه فورياً إلى تطبيق المتبرعين على الهواتف الذكية. يرجى الاتصال بالإنترنت والمحاولة مجدداً.",
        },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const errors: Record<string, string> = {};

  const bloodType = requireOption(errors, "bloodType", body.bloodType, "فصيلة الدم", [...BLOOD_TYPES]);
  const component = requireOption(errors, "component", body.component, "نوع مكوّن الدم", [...BLOOD_COMPONENTS]);
  const unitsNeeded = requireNumber(errors, "unitsNeeded", body.unitsNeeded, "عدد الوحدات المطلوبة", { min: 1, max: Number.MAX_SAFE_INTEGER });
  const hospital = requireText(errors, "hospital", body.hospital, "المستشفى / الجهة");
  const publishDate = requireDate(errors, "publishDate", body.publishDate, "تاريخ النشر");
  const urgency = body.urgency
    ? requireOption(errors, "urgency", body.urgency, "درجة الاستعجال", URGENCY_OPTIONS.map((item) => item.value))
    : "normal";
  const phone = optionalText(body.phone);
  const notes = optionalText(body.notes);

    if (Object.keys(errors).length > 0) {
      return Response.json({ message: "يرجى تصحيح الحقول المطلوبة", errors }, { status: 400 });
    }

    const [created] = await db
      .insert(donationPosts)
      .values({ bloodType, component, unitsNeeded, hospital, publishDate, urgency, phone, notes })
      .returning();
    await writeAudit({ user, action: "create", entity: "donation_posts", entityId: created.id, page: "/reception/posts", ip: clientIp(request) });

    return Response.json({ post: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
