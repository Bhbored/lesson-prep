import type { Language } from "@/app/shared/schemas/domain";
import en from "./en.json";
import ar from "./ar.json";
import fr from "./fr.json";

const dictionaries = { en, ar, fr } satisfies Record<
  Language,
  Record<keyof typeof en, string>
>;

export function translations(language: Language) {
  return dictionaries[language];
}
