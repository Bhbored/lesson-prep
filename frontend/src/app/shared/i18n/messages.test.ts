import { expect, it } from "vitest";
import en from "./en.json";
import ar from "./ar.json";
import fr from "./fr.json";
import { translations } from "./messages";

it("provides complete English, Arabic, and French interface dictionaries", () => {
  const keys = Object.keys(en).sort();
  for (const dictionary of [ar, fr]) {
    expect(Object.keys(dictionary).sort()).toEqual(keys);
    expect(Object.values(dictionary).every((value) => value.trim().length > 0)).toBe(true);
  }
  expect(translations("en").settings).toBe("Settings");
  expect(translations("ar").settings).toBe("الإعدادات");
  expect(translations("fr").settings).toBe("Paramètres");
});
