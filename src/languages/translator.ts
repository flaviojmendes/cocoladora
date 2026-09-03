import { languageMap as en } from "./en";
import { languageMap as pt } from "./pt";

export function translate(key: string): string {
  try {
    const raw = localStorage.getItem("userLanguage");
    const language = raw ? raw.replace(/"/g, "") : "pt";

    if (language.includes("en")) {
      return en[key] || pt[key] || key;
    }
    return pt[key] || en[key] || key;
  } catch {
    return pt[key] || en[key] || key;
  }
}
