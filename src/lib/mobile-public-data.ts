type MobileBloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
type MobilePost = {
  id: string; title: string; description: string; image: string | null; createdAt: string; author: string;
  category: string; isUrgent: boolean; status: "published" | "archived"; bloodType: MobileBloodType;
  component: string; unitsNeeded: number; hospital: string; phone: string | null;
  urgency: "normal" | "urgent" | "critical"; publishDate: string;
};
type MobileRequest = {
  id: string; patientName: string; facility: string; city: string; bloodType: MobileBloodType;
  component: string; requestNumber?: string; units: number; neededBy: string; requestedAt?: string;
  status: "urgent" | "open" | "closed"; note: string;
};

export function pageWindow(searchParams: URLSearchParams) {
  const requestedLimit = Number(searchParams.get("limit") ?? 10);
  const requestedOffset = Number(searchParams.get("offset") ?? 0);
  const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, Math.trunc(requestedLimit))) : 10;
  const offset = Number.isFinite(requestedOffset) ? Math.max(0, Math.trunc(requestedOffset)) : 0;
  return { limit, offset };
}

export function mapMobilePost(row: {
  id: number; bloodType: string; component: string; unitsNeeded: number; hospital: string;
  phone: string | null; urgency: string; publishDate: string; notes: string | null; status: string; createdAt: Date;
}): MobilePost {
  return {
    id: String(row.id),
    title: `${row.bloodType} — ${row.unitsNeeded} وحدة مطلوبة`,
    description: row.notes || row.hospital,
    image: null,
    createdAt: row.createdAt.toISOString(),
    author: row.hospital,
    category: row.component,
    isUrgent: row.urgency !== "normal",
    status: row.status === "published" ? "published" : "archived",
    bloodType: row.bloodType as MobileBloodType,
    component: row.component,
    unitsNeeded: row.unitsNeeded,
    hospital: row.hospital,
    phone: row.phone,
    urgency: row.urgency as MobilePost["urgency"],
    publishDate: row.publishDate,
  };
}

export function mapMobileRequest(row: {
  id: number; patientName: string; requester: string; bloodType: string; component: string;
  unitsRequested: number; priority: string; status: string; requestDate: string; notes: string | null;
}): MobileRequest {
  const status = row.status === "fulfilled" || row.status === "cancelled"
    ? "closed"
    : row.priority === "urgent" || row.priority === "critical" ? "urgent" : "open";
  return {
    id: String(row.id),
    patientName: row.patientName,
    facility: row.requester,
    city: "",
    bloodType: row.bloodType as MobileBloodType,
    component: row.component,
    requestNumber: undefined,
    units: row.unitsRequested,
    neededBy: row.requestDate,
    requestedAt: row.requestDate,
    status,
    note: row.notes ?? "",
  };
}
