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

const LANGUAGE_NAMES: Record<string, string> = {
  "ar-AE": "Árabe (Emiratos Árabes)",
  "de-DE": "Alemán (Alemania)",
  "en-US": "Inglés (Estados Unidos)",
  "es-ES": "Español (España)",
  "es-MX": "Español (México)",
  "fr-FR": "Francés (Francia)",
  "id-ID": "Indonesio (Indonesia)",
  "it-IT": "Italiano (Italia)",
  "ja-JP": "Japonés (Japón)",
  "ko-KR": "Coreano (Corea)",
  "pl-PL": "Polaco (Polonia)",
  "pt-BR": "Portugués (Brasil)",
  "ru-RU": "Ruso (Rusia)",
  "th-TH": "Tailandés (Tailandia)",
  "tr-TR": "Turco (Turquía)",
  "vi-VN": "Vietnamita (Vietnam)",
  "zh-CN": "Chino (China)",
  "zh-TW": "Chino (Taiwán)",
};

export function languageLabel(locale: string): string {
  return LANGUAGE_NAMES[locale] ?? locale;
}

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
