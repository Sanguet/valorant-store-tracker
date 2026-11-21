import { parseAuthBody, type AuthTokens } from "@/domain/auth";

export const RIOT_AUTH_URL = "https://auth.riotgames.com/api/v1/authorization";
export const RIOT_LOGIN_URL = "https://authenticate.riotgames.com/api/v1/login";
export const RIOT_LOGIN_TOKEN_URL = "https://auth.riotgames.com/api/v1/login-token";

const AUTH_SETUP = {
  client_id: "riot-client",
  nonce: "1",
  redirect_uri: "http://localhost/redirect",
  response_type: "token id_token",
  scope: "account openid",
};

export interface AuthReply {
  status: number;
  body: unknown;
  cookies: Record<string, string>;
}

export interface AuthExchange {
  (method: "POST" | "PUT", url: string, body: unknown, cookies: Record<string, string>): Promise<AuthReply>;
}

export type LoginStop =
  | { step: "tokens"; tokens: AuthTokens; cookies: Record<string, string> }
  | { step: "mfa"; method: string | null; hint: string | null; cookies: Record<string, string> }
  | { step: "captcha" }
  | { step: "invalid-code" }
  | { step: "auth-failure" }
  | { step: "unexpected" };

function recordOf(body: unknown): Record<string, unknown> | null {
  return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
}

function hasCaptcha(body: unknown): boolean {
  const record = recordOf(body);
  if (!record) return false;
  if (record.captcha) return true;
  return typeof record.error === "string" && record.error.toLowerCase().includes("captcha");
}

function loginToken(body: unknown): string | null {
  const success = recordOf(body)?.success;
  if (!success || typeof success !== "object") return null;
  const token = (success as Record<string, unknown>).login_token;
  return typeof token === "string" && token.length > 0 ? token : null;
}

function stopFrom(body: unknown, cookies: Record<string, string>): LoginStop {
  const outcome = parseAuthBody(body);
  if (outcome.kind === "tokens") {
    return {
      step: "tokens",
      tokens: { accessToken: outcome.accessToken, idToken: outcome.idToken, expiresIn: outcome.expiresIn },
      cookies,
    };
  }
  if (outcome.kind === "mfa") return { step: "mfa", method: outcome.method, hint: outcome.hint, cookies };
  if (outcome.kind === "captcha") return { step: "captcha" };
  if (outcome.kind === "invalid-code") return { step: "invalid-code" };
  if (outcome.kind === "auth-failure") return { step: "auth-failure" };
  return { step: "unexpected" };
}

async function tokensFromLoginToken(exchange: AuthExchange, cookies: Record<string, string>, token: string): Promise<LoginStop> {
  const posted = await exchange(
    "POST",
    RIOT_LOGIN_TOKEN_URL,
    { authentication_type: "RiotAuth", code_verifier: "", login_token: token, persist_login: false },
    cookies,
  );
  const authorized = await exchange("POST", RIOT_AUTH_URL, AUTH_SETUP, posted.cookies);
  return stopFrom(authorized.body, authorized.cookies);
}

async function afterCredentials(exchange: AuthExchange, body: unknown, cookies: Record<string, string>): Promise<LoginStop> {
  if (hasCaptcha(body)) return { step: "captcha" };
  const token = loginToken(body);
  if (token) return tokensFromLoginToken(exchange, cookies, token);
  return stopFrom(body, cookies);
}

export async function beginRemoteLogin(
  exchange: AuthExchange,
  input: { username: string; password: string; language: string; sdkVersion: string },
): Promise<LoginStop> {
  const opened = await exchange("POST", RIOT_AUTH_URL, AUTH_SETUP, {});
  const challenge = await exchange(
    "POST",
    RIOT_LOGIN_URL,
    {
      clientId: "riot-client",
      language: "",
      platform: "windows",
      remember: false,
      riot_identity: { language: input.language, state: "auth" },
      sdkVersion: input.sdkVersion,
      type: "auth",
    },
    opened.cookies,
  );
  if (hasCaptcha(challenge.body)) return { step: "captcha" };
  const early = stopFrom(challenge.body, challenge.cookies);
  if (early.step !== "unexpected") return early;
  const sent = await exchange(
    "PUT",
    RIOT_LOGIN_URL,
    {
      type: "auth",
      riot_identity: {
        captcha: null,
        language: input.language,
        password: input.password,
        remember: false,
        username: input.username,
      },
    },
    challenge.cookies,
  );
  return afterCredentials(exchange, sent.body, sent.cookies);
}

export async function continueRemoteLogin(exchange: AuthExchange, cookies: Record<string, string>, code: string): Promise<LoginStop> {
  const reply = await exchange(
    "PUT",
    RIOT_LOGIN_URL,
    { type: "multifactor", multifactor: { otp: code, rememberDevice: false } },
    cookies,
  );
  return afterCredentials(exchange, reply.body, reply.cookies);
}
