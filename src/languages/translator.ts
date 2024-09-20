import { languageMap as en } from "./en";
import { languageMap as pt } from "./pt";

export function translate(key: string): string {
  const language = localStorage.getItem("userLanguage");

  if (language && language.includes("pt")) {
    return pt[key];
  } else if (language && language.includes("en")) {
    return en[key];
  } else {
    return pt[key];
  }
}
