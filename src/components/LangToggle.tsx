"use client";

import { useLanguage } from "@/lib/i18n-context";

export default function LangToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="inline-flex items-center rounded-xl border border-[var(--border-line)] bg-[var(--bg-card)] p-1 text-[12.5px] font-semibold">
      <button
        type="button"
        onClick={() => setLang("ar")}
        className={`rounded-lg px-2.5 py-1 transition-colors ${
          lang === "ar"
            ? "bg-[var(--color-brand)] text-white shadow-sm"
            : "text-[var(--text-muted)] hover:text-[var(--text-ink)]"
        }`}
      >
        العربية
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`rounded-lg px-2.5 py-1 transition-colors ${
          lang === "en"
            ? "bg-[var(--color-brand)] text-white shadow-sm"
            : "text-[var(--text-muted)] hover:text-[var(--text-ink)]"
        }`}
      >
        English
      </button>
    </div>
  );
}
