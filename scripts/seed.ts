import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../src/db";
import { users, inventoryThresholds } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { BLOOD_TYPES } from "../src/lib/constants";

/**
 * seed تقني فقط:
 * - ينشئ حسابات النظام (المدير والموظفون) إذا لم تكن موجودة — لا يحذف الموجود.
 * - يضبط الحدود الدنيا للمخزون لكل فصيلة.
 * لا ينشئ أي مرضى/متبرعين/موظفين/وحدات وهمية تظهر للمستخدم النهائي.
 */
async function main() {
  console.log("Ensuring system accounts...");
  const pw = async (p: string) => bcrypt.hash(p, 10);
  const accounts = [
    { username: "admin", fullName: "مدير النظام", password: "admin123", role: "admin" },
    { username: "manager", fullName: "مدير بنك الدم", password: "manager123", role: "manager" },
    { username: "reception", fullName: "موظف الاستقبال", password: "reception123", role: "reception" },
    { username: "lab", fullName: "موظف المختبر", password: "lab123", role: "lab" },
    { username: "inventory", fullName: "موظف المخزون", password: "inventory123", role: "inventory" },
  ];

  for (const acc of accounts) {
    const [existing] = await db.select().from(users).where(eq(users.username, acc.username));
    if (existing) {
      console.log(`  - ${acc.username} موجود مسبقًا (تم الحفاظ عليه)`);
      continue;
    }
    await db.insert(users).values({
      username: acc.username,
      fullName: acc.fullName,
      passwordHash: await pw(acc.password),
      role: acc.role,
      active: true,
    });
    console.log(`  + أُنشئ الحساب ${acc.username}`);
  }

  console.log("Ensuring inventory thresholds...");
  for (const bt of BLOOD_TYPES) {
    const [existing] = await db.select().from(inventoryThresholds).where(eq(inventoryThresholds.bloodType, bt));
    if (!existing) {
      await db.insert(inventoryThresholds).values({ bloodType: bt, minUnits: bt.includes("-") ? 3 : 6 });
    }
  }

  console.log("Seed complete (accounts + thresholds only).");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
