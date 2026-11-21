export function rememberSetCookie(jar: Map<string, string>, setCookies: string[]) {
  for (const line of setCookies) {
    const pair = line.split(";")[0] ?? "";
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name) jar.set(name, value);
  }
}

export function cookieHeader(jar: Map<string, string>): string {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}
