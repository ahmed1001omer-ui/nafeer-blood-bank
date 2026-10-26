import { getBloodBankSettings } from "@/lib/blood-bank-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const bank = await getBloodBankSettings();
  if (!bank.name && !bank.address && !bank.phone) return Response.json({ centers: [] });
  return Response.json({ centers: [{ id: "blood-bank", name: bank.name, address: bank.address, phone: bank.phone }] });
}
