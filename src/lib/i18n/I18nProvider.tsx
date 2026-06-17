import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LANGUAGES, RTL_LANGS, translate, type LangCode } from "./translations";

interface I18nValue {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string) => string;
  dir: "ltr" | "rtl";
  languages: typeof LANGUAGES;
}

const I18nContext = createContext<I18nValue | null>(null);

const STORAGE_KEY = "afghanmarket.lang";

function detectInitialLang(): LangCode {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY) as LangCode | null;
  if (stored && LANGUAGES.some((l) => l.code === stored)) return stored;
  const nav = (window.navigator.language || "en").toLowerCase();
  if (nav.startsWith("fa-af") || nav.startsWith("prs")) return "fa";
  if (nav.startsWith("ps")) return "ps";
  if (nav.startsWith("fa")) return "fa_IR";
  if (nav.startsWith("ar")) return "ar";
  if (nav.startsWith("ur")) return "ur";
  if (nav.startsWith("zh-tw") || nav.startsWith("zh-hk")) return "zh_TW";
  if (nav.startsWith("zh")) return "zh_CN";
  const two = nav.slice(0, 2) as LangCode;
  if (LANGUAGES.some((l) => l.code === two)) return two;
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    const initial = detectInitialLang();
    setLangState(initial);
  }, []);

  useEffect(() => {
    const dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("dir", dir);
      document.documentElement.setAttribute("lang", lang.replace("_", "-"));
    }
  }, [lang]);

  const setLang = (l: LangCode) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, l);
  };

  const dir: "ltr" | "rtl" = RTL_LANGS.includes(lang) ? "rtl" : "ltr";

  return (
    <I18nContext.Provider
      value={{ lang, setLang, t: (k) => translate(lang, k), dir, languages: LANGUAGES }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
