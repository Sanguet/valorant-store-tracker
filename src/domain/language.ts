const API_LANGUAGES = new Set([
  "ar-AE",
  "de-DE",
  "en-US",
  "es-ES",
  "es-MX",
  "fr-FR",
  "id-ID",
  "it-IT",
  "ja-JP",
  "ko-KR",
  "pl-PL",
  "pt-BR",
  "ru-RU",
  "th-TH",
  "tr-TR",
  "vi-VN",
  "zh-CN",
  "zh-TW",
]);

export const LANGUAGE_OPTIONS = [...API_LANGUAGES];

export function toApiLanguage(locale: string | null | undefined): string {
  if (!locale) return "es-ES";
  const normalized = locale.replaceAll("_", "-");
  const exact = [...API_LANGUAGES].find((language) => language.toLowerCase() === normalized.toLowerCase());
  if (exact) return exact;
  const base = normalized.split("-")[0]?.toLowerCase();
  if (base === "es") return "es-ES";
  const match = [...API_LANGUAGES].find((language) => language.toLowerCase().startsWith(`${base}-`));
  return match ?? "en-US";
}

export function toRiotLanguage(locale: string): string {
  return toApiLanguage(locale).replace("-", "_");
}
