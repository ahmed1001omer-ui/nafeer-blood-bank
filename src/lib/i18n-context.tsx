"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Language, translations } from "./translations";

interface LanguageContextType {
  lang: Language;
  dir: "rtl" | "ltr";
  setLang: (lang: Language) => void;
  t: (key: keyof (typeof translations)["ar"]) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ar",
  dir: "rtl",
  setLang: () => {},
  t: (key) => translations.ar[key] || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("ar");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bbms_lang") as Language;
      if (saved && (saved === "ar" || saved === "en")) {
        setLangState(saved);
        document.documentElement.setAttribute("lang", saved);
        document.documentElement.setAttribute("dir", saved === "ar" ? "rtl" : "ltr");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    document.documentElement.setAttribute("lang", newLang);
    document.documentElement.setAttribute("dir", newLang === "ar" ? "rtl" : "ltr");
    try {
      localStorage.setItem("bbms_lang", newLang);
    } catch {
      /* ignore */
    }
  };

  const dir = lang === "ar" ? "rtl" : "ltr";

  const t = (key: keyof (typeof translations)["ar"]): string => {
    return translations[lang]?.[key] || translations.ar[key] || (key as string);
  };

  return (
    <LanguageContext.Provider value={{ lang, dir, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
