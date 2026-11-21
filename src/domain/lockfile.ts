export interface Lockfile {
  name: string;
  pid: string;
  port: string;
  password: string;
  protocol: string;
}

export function parseLockfile(text: string): Lockfile | null {
  const line = text.trim().split(/\r?\n/)[0] ?? "";
  const parts = line.split(":");
  if (parts.length < 5) return null;
  const protocol = parts[parts.length - 1] ?? "";
  const password = parts.slice(3, -1).join(":");
  const [name, pid, port] = parts;
  if (!name || !pid || !port || !password || (protocol !== "https" && protocol !== "http")) return null;
  if (!/^\d+$/.test(port)) return null;
  return { name, pid, port, password, protocol };
}
