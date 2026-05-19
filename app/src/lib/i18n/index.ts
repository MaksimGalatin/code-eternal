import { create } from "zustand";
import { persist } from "zustand/middleware";
import { en } from "./en";
import { ru } from "./ru";
import { es } from "./es";
import { zh } from "./zh";

export type Lang = "en" | "ru" | "es" | "zh";

export const translations = { en, ru, es, zh } as const;

export type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, lang: Lang): string {
  return (translations[lang] as Record<string, string>)[key] ?? (translations.en as Record<string, string>)[key] ?? key;
}

interface LangStore {
  lang: Lang;
  setLang: (l: Lang) => void;
}

export const useLang = create<LangStore>()(
  persist(
    (set) => ({ lang: "en", setLang: (lang) => set({ lang }) }),
    { name: "ce-lang" }
  )
);
