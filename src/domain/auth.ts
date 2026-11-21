export interface AuthTokens {
  accessToken: string;
  idToken: string;
  expiresIn: number;
}

export type AuthOutcome =
  | ({ kind: "tokens" } & AuthTokens)
  | { kind: "mfa"; method: string | null; hint: string | null }
  | { kind: "captcha" }
  | { kind: "invalid-code" }
  | { kind: "auth-failure" }
  | { kind: "unexpected" };

export function parseRedirect(uri: string): AuthTokens | null {
  const hash = uri.includes("#") ? uri.slice(uri.indexOf("#") + 1) : uri.includes("?") ? uri.slice(uri.indexOf("?") + 1) : "";
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  const idToken = params.get("id_token");
  if (!accessToken || !idToken) return null;
  const expiresIn = Number(params.get("expires_in") ?? "3600");
  return { accessToken, idToken, expiresIn: Number.isFinite(expiresIn) ? expiresIn : 3600 };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function uriFrom(record: Record<string, unknown>): string | null {
  const response = record.response;
  if (response && typeof response === "object") {
    const parameters = (response as Record<string, unknown>).parameters;
    if (parameters && typeof parameters === "object") {
      const uri = (parameters as Record<string, unknown>).uri;
      if (typeof uri === "string") return uri;
    }
  }
  const success = record.success;
  if (success && typeof success === "object") {
    const redirect = (success as Record<string, unknown>).redirect_url;
    if (typeof redirect === "string") return redirect;
  }
  return text(record.redirect_url);
}

export function parseAuthBody(body: unknown): AuthOutcome {
  if (!body || typeof body !== "object") return { kind: "unexpected" };
  const record = body as Record<string, unknown>;
  if (record.type === "multifactor") {
    if (record.error === "invalid_code") return { kind: "invalid-code" };
    const multifactor = record.multifactor;
    const detail = multifactor && typeof multifactor === "object" ? (multifactor as Record<string, unknown>) : undefined;
    return { kind: "mfa", method: text(detail?.method), hint: text(detail?.email) };
  }
  const uri = uriFrom(record);
  if (uri) {
    const tokens = parseRedirect(uri);
    if (tokens) return { kind: "tokens", ...tokens };
  }
  const error = typeof record.error === "string" ? record.error.toLowerCase() : "";
  if (record.captcha || error.includes("captcha")) return { kind: "captcha" };
  if (error === "auth_failure" || error.length > 0) return { kind: "auth-failure" };
  return { kind: "unexpected" };
}
