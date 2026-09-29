import { useEffect } from "react";
import type { ReactNode } from "react";
import { useSettings } from "./settings";

export function I18nProvider({ children }: Readonly<{ children: ReactNode }>) {
  const { settings } = useSettings();
  useEffect(() => {
    document.documentElement.lang = settings.displayLanguage;
    document.documentElement.dir =
      settings.displayLanguage === "ar" ? "rtl" : "ltr";
  }, [settings.displayLanguage]);
  return children;
}
