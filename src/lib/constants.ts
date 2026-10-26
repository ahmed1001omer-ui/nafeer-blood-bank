export const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const GENDERS = [
  { value: "male", label: "ذكر" },
  { value: "female", label: "أنثى" },
] as const;

export const RH_TYPES = [
  { value: "positive", label: "Rh موجب (+)" },
  { value: "negative", label: "Rh سالب (-)" },
] as const;

export const BLOOD_COMPONENTS = [
  "دم كامل",
  "كريات حمراء المركزة",
  "بلازما",
  "صفائح دموية",
  "كريات بيضاء",
] as const;

export const UNIT_STATUSES = [
  { value: "available", label: "متاح", tone: "success" },
  { value: "reserved", label: "محجوز", tone: "info" },
  { value: "dispensed", label: "مصروف", tone: "muted" },
  { value: "quarantine", label: "تحت الحجر", tone: "warning" },
  { value: "expired", label: "منتهي", tone: "danger" },
  { value: "rejected", label: "مرفوض", tone: "danger" },
] as const;

export const EMPLOYEE_ROLES = [
  "مدير بنك الدم",
  "موظف استقبال",
  "موظف مختبر",
  "أخصائي مختبر",
  "مسؤول المخزون",
  "ممرض",
  "مسؤول النظام",
] as const;

export const EMPLOYEE_STATUSES = [
  { value: "active", label: "نشط" },
  { value: "inactive", label: "غير نشط" },
] as const;

export const INITIAL_EXAM_RESULTS = [
  "مطابق للشروط",
  "يحتاج إعادة الفحص",
  "غير مطابق للشروط",
] as const;

export const ELIGIBILITY_OPTIONS = [
  { value: "eligible", label: "مؤهل" },
  { value: "not_eligible", label: "غير مؤهل" },
] as const;

export const DONOR_STATUS_LABELS: Record<string, string> = {
  reception_rejected: "غير مؤهل — لم يُرسل للمختبر",
  waiting_lab: "مؤهل — بانتظار نتيجة فحص الفيروسات",
  eligible: "مؤهل للتبرع",
  temp_banned: "محظور مؤقتًا",
  final_banned: "محظور من التبرع نهائيًا",
  deferred: "مؤجل",
};

export const DONOR_STAGE_LABELS: Record<string, string> = {
  reception: "الاستقبال",
  waiting_lab: "بانتظار فحص المختبر",
  completed: "اكتمل الفحص",
};

/** الحالات التي يمنع التبرع نهائيًا */
export const FINAL_BAN_REASONS = [
  "HIV / الإيدز",
  "التهاب الكبد الوبائي B",
  "التهاب الكبد الوبائي C",
  "HTLV",
  "الإيبولا بعد الشفاء",
  "أمراض القلب الشديدة",
  "فشل القلب",
  "جلطة سابقة",
  "ذبحة صدرية",
  "السرطان",
  "أمراض سيولة الدم (الهيموفيليا)",
  "مرض شاغاس",
] as const;

/** الحالات التي تسبب حظرًا مؤقتًا */
export const TEMPORARY_BAN_REASONS = [
  "الملاريا",
  "السل TB",
  "الزهري Syphilis",
  "كورونا",
  "الأنفلونزا والحمى",
  "التيفوئيد",
] as const;

/** حالات تأجيل التبرع */
export const DEFERRAL_REASONS = [
  "الأنيميا — الهيموجلوبين أقل من 12.5",
  "الضغط العالي وقت التبرع",
  "الضغط الواطي وقت التبرع",
  "السكري مع استخدام الأنسولين",
  "الوشم والحجامة — 6 أشهر",
  "عملية جراحية كبيرة — 6 أشهر",
  "أخذ مضاد حيوي — أسبوع بعد انتهاء العلاج",
  "الوزن أقل من 50 كيلو",
] as const;

export const TEST_RESULTS = [
  { value: "negative", label: "سالب" },
  { value: "positive", label: "إيجابي" },
  { value: "indeterminate", label: "غير حاسم" },
  { value: "not_tested", label: "لم يتم الاختبار" },
] as const;

export const LAB_DECISIONS = [
  { value: "eligible", label: "مؤهل للتبرع" },
  { value: "temp_banned", label: "محظور مؤقتًا" },
  { value: "final_banned", label: "محظور نهائيًا" },
  { value: "deferred", label: "مؤجل" },
] as const;

export const URGENCY_OPTIONS = [
  { value: "normal", label: "عادي" },
  { value: "urgent", label: "عاجل" },
  { value: "critical", label: "حرج" },
] as const;

export const HOSPITAL_NAME = "المستشفى الرئيسي";
export const SYSTEM_NAME = "نظام إدارة بنك الدم";

export const PRIORITY_OPTIONS = [
  { value: "critical", label: "حرجة" },
  { value: "urgent", label: "عاجلة" },
  { value: "normal", label: "عادية" },
] as const;

export const REQUEST_STATUSES = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "partial", label: "منفّذ جزئيًا" },
  { value: "fulfilled", label: "منفّذ" },
  { value: "cancelled", label: "ملغى" },
] as const;

export const DONATION_STATUSES = [
  { value: "completed", label: "مكتمل" },
  { value: "under_review", label: "قيد الفحص" },
  { value: "rejected", label: "مرفوض" },
] as const;

export const priorityLabel = (value: string) =>
  PRIORITY_OPTIONS.find((item) => item.value === value)?.label ?? value;

export const requestStatusLabel = (value: string) =>
  REQUEST_STATUSES.find((item) => item.value === value)?.label ?? value;

export const donationStatusLabel = (value: string) =>
  DONATION_STATUSES.find((item) => item.value === value)?.label ?? value;

/** الفيروسات التي تؤدي إلى حظر نهائي تلقائيًا */
export const FINAL_POSITIVE_TESTS = ["hiv", "hepatitisB", "hepatitisC", "htlv"] as const;
/** الفيروسات التي تؤدي إلى حظر مؤقت تلقائيًا */
export const TEMP_POSITIVE_TESTS = ["syphilis", "malaria"] as const;

export const reasonListForDecision = (decision: string): readonly string[] => {
  if (decision === "final_banned") return FINAL_BAN_REASONS;
  if (decision === "temp_banned") return TEMPORARY_BAN_REASONS;
  if (decision === "deferred") return DEFERRAL_REASONS;
  return [];
};

export const unitStatusLabel = (value: string) =>
  UNIT_STATUSES.find((item) => item.value === value)?.label ?? value;

export const rhLabel = (value: string) => (value === "negative" ? "-" : "+");

export const genderLabel = (value: string) =>
  GENDERS.find((item) => item.value === value)?.label ?? value;
