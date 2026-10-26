"use client";

import { usePathname } from "next/navigation";
import { EMPLOYEES_BACKGROUND, sectionForPath } from "@/lib/section-backgrounds";

/**
 * خلفية القسم الحالي — تظهر خلف المحتوى فقط، دون أي تأثير على البيانات أو التنقل.
 */
export default function SectionBackground() {
  const pathname = usePathname();
  const section = sectionForPath(pathname);
  const image =
    section?.image ?? (pathname.startsWith("/employees") ? EMPLOYEES_BACKGROUND : null);

  if (!image) return null;

  return (
    <div
      aria-hidden="true"
      className="section-backdrop"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(248,249,250,0.86) 0%, rgba(248,249,250,0.92) 55%, rgba(248,249,250,0.96) 100%), url(${image})`,
      }}
    />
  );
}
