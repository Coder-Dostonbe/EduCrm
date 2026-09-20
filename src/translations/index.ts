import { en, type Dict } from "./en";
import { uz } from "./uz";
import { ru } from "./ru";
import type { Language } from "@/types";

export const translations: Record<Language, Dict> = { uz, ru, en };

export const languageNames: Record<Language, string> = {
  uz: "O'zbekcha",
  ru: "Русский",
  en: "English",
};

export const languageFlags: Record<Language, string> = {
  uz: "UZ",
  ru: "RU",
  en: "EN",
};

export type { Dict };
