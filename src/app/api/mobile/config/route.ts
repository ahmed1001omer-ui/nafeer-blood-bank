import { getBloodBankSettings } from "@/lib/blood-bank-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const bank = await getBloodBankSettings();
  return Response.json({
    bloodBank: bank,
    appName: "نفير",
    centerName: bank.name,
    hospitalName: bank.hospitalName || "المستشفى الرئيسي",
  });
}
