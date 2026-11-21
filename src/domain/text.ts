export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function formatVp(value: number): string {
  return `${new Intl.NumberFormat("es-AR").format(value)} VP`;
}

export function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return "Venció";
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / (60 * 24));
  const hours = Math.floor((minutes % (60 * 24)) / 60);
  const rest = minutes % 60;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${rest} min`;
  return `${Math.max(rest, 1)} min`;
}

export function accountLabel(account: { gameName: string | null; tagLine: string | null } | null): string {
  if (!account?.gameName) return "Sin cuenta todavía";
  return account.tagLine ? `${account.gameName}#${account.tagLine}` : account.gameName;
}
