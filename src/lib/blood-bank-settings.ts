import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { systemSettings } from "@/db/schema";

export type BloodBankSettings = {
  name: string;
  hospitalName: string;
  address: string;
  phone: string;
  city: string;
};

export const BLOOD_BANK_SETTINGS_KEY = "blood_bank_info";

export const DEFAULT_BLOOD_BANK_SETTINGS: BloodBankSettings = {
  name: "بنك الدم المركزي",
  hospitalName: "المستشفى المركزي",
  address: "المجمع الطبي الرئيسي",
  phone: "0912345678",
  city: "الخرطوم",
};

export async function getBloodBankSettings(): Promise<BloodBankSettings> {
  const [row] = await db.select({ value: systemSettings.value }).from(systemSettings)
    .where(eq(systemSettings.key, BLOOD_BANK_SETTINGS_KEY));
  const value = row?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_BLOOD_BANK_SETTINGS;
  }
  const data = value as Record<string, unknown>;
  const name = typeof data.name === "string" && data.name.trim() ? data.name.trim() : DEFAULT_BLOOD_BANK_SETTINGS.name;
  const hospitalName = typeof data.hospitalName === "string" && data.hospitalName.trim() ? data.hospitalName.trim() : DEFAULT_BLOOD_BANK_SETTINGS.hospitalName;
  const address = typeof data.address === "string" && data.address.trim() ? data.address.trim() : DEFAULT_BLOOD_BANK_SETTINGS.address;
  const phone = typeof data.phone === "string" && data.phone.trim() ? data.phone.trim() : DEFAULT_BLOOD_BANK_SETTINGS.phone;
  const city = typeof data.city === "string" && data.city.trim() ? data.city.trim() : DEFAULT_BLOOD_BANK_SETTINGS.city;
  return { name, hospitalName, address, phone, city };
}
