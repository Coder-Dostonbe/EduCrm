"use client";

import * as React from "react";
import { translations, type Dict } from "@/translations";
import type { Language } from "@/types";

const STORAGE_KEY = "eduflow.language";
const DEFAULT_LANGUAGE: Language = "uz";

interface I18nContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  dict: Dict;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = React.useState<Language>(DEFAULT_LANGUAGE);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "uz" || stored === "ru" || stored === "en") {
        // Reading browser storage is only possible after hydration.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLanguageState(stored);
      }
    } catch {
      // localStorage unavailable — keep default
    }
  }, []);

  const setLanguage = React.useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    document.documentElement.lang = lang;
  }, []);

  const value = React.useMemo<I18nContextValue>(
    () => ({ language, setLanguage, dict: translations[language] }),
    [language, setLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

/** Shorthand: returns the active dictionary. */
export function useT(): Dict {
  return useI18n().dict;
}
