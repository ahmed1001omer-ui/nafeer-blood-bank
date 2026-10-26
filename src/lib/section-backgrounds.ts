/**
 * خلفيات الأقسام — لكل قسم من أقسام النظام خلفية خاصة تظهر خلف المحتوى
 * بطبقة تبييض عالية حتى يبقى التصميم نظيفًا والنصوص واضحة.
 */
export type SectionKey = "admin" | "reception" | "lab" | "inventory";

export type SectionBackgroundConfig = {
  key: SectionKey;
  /** بداية المسار الذي ينتمي للقسم */
  basePath: string;
  image: string;
  /** وصف القسم */
  label: string;
  /** تشغيل أو تعطيل خلفية القسم */
  enabled: boolean;
};

/** ترتيب مهم: المسارات الأكثر تحديدًا أولًا */
export const SECTION_BACKGROUNDS: SectionBackgroundConfig[] = [
  {
    key: "reception",
    basePath: "/reception",
    image: "/images/section-reception.jpg",
    label: "قسم الاستقبال",
    enabled: true,
  },
  {
    key: "lab",
    basePath: "/lab",
    image: "/images/section-lab.jpg",
    label: "قسم المختبر",
    enabled: true,
  },
  {
    key: "inventory",
    basePath: "/inventory",
    image: "/images/section-inventory.jpg",
    label: "قسم المخزون",
    enabled: true,
  },
  {
    key: "admin",
    basePath: "/dashboard",
    image: "/images/section-admin.jpg",
    label: "قسم الإدارة",
    enabled: true,
  },
];

export const EMPLOYEES_BACKGROUND = "/images/section-admin.jpg";

export function sectionForPath(pathname: string): SectionBackgroundConfig | null {
  return (
    SECTION_BACKGROUNDS.find(
      (section) => section.enabled && pathname.startsWith(section.basePath),
    ) ?? null
  );
}
