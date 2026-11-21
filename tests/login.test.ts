import { describe, expect, it } from "vitest";
import { beginRemoteLogin, continueRemoteLogin, type AuthExchange, type AuthReply } from "@/domain/riot-login";

const PASSWORD = "not-the-real-password";
const input = { username: "probe-not-ivan", password: PASSWORD, language: "es_MX", sdkVersion: "23.8.0.1382" };

function scripted(replies: AuthReply[]): { exchange: AuthExchange; bodies: unknown[] } {
  const bodies: unknown[] = [];
  const exchange: AuthExchange = async (_method, _url, body, cookies) => {
    bodies.push(body);
    const next = replies.shift();
    if (!next) throw new Error("sin respuesta");
    return { ...next, cookies: { ...cookies, ...next.cookies } };
  };
  return { exchange, bodies };
}

const open: AuthReply = { status: 200, body: { type: "auth" }, cookies: { asid: "cookie" } };
const clearChallenge: AuthReply = { status: 200, body: { type: "auth" }, cookies: {} };
const uri = "http://localhost/redirect#access_token=aaa&id_token=bbb&expires_in=3600";

describe("remote login", () => {
  it("stops when Riot asks for a captcha and never sends the password", async () => {
    const { exchange, bodies } = scripted([
      open,
      { status: 200, body: { type: "auth", captcha: { type: "hcaptcha" } }, cookies: { "authenticator.sid": "sid" } },
    ]);
    const stop = await beginRemoteLogin(exchange, input);
    expect(stop.step).toBe("captcha");
    expect(bodies).toHaveLength(2);
    expect(JSON.stringify(bodies)).not.toContain(PASSWORD);
    expect(JSON.stringify(stop)).not.toContain(PASSWORD);
  });

  it("stops on mfa after the password step and does not keep the password", async () => {
    const { exchange, bodies } = scripted([
      open,
      clearChallenge,
      { status: 200, body: { type: "multifactor", multifactor: { method: "email", email: "i***@mail.com" } }, cookies: {} },
    ]);
    const stop = await beginRemoteLogin(exchange, input);
    expect(stop).toMatchObject({ step: "mfa", method: "email", hint: "i***@mail.com" });
    expect(JSON.stringify(stop)).not.toContain(PASSWORD);
    expect(JSON.stringify(bodies[1])).not.toContain(PASSWORD);
  });

  it("stops again when the password response is a captcha", async () => {
    const { exchange, bodies } = scripted([
      open,
      clearChallenge,
      { status: 200, body: { type: "auth", error: "auth_failure", captcha: { type: "hcaptcha" } }, cookies: {} },
    ]);
    const stop = await beginRemoteLogin(exchange, input);
    expect(stop.step).toBe("captcha");
    expect(bodies).toHaveLength(3);
  });

  it("reports a bad password without a session", async () => {
    const { exchange } = scripted([open, clearChallenge, { status: 200, body: { type: "auth", error: "auth_failure" }, cookies: {} }]);
    const stop = await beginRemoteLogin(exchange, input);
    expect(stop.step).toBe("auth-failure");
  });

  it("finishes only after Riot accepts the login token", async () => {
    const { exchange } = scripted([
      open,
      clearChallenge,
      { status: 200, body: { type: "success", success: { login_token: "lt" } }, cookies: { ssid: "next" } },
      { status: 200, body: {}, cookies: {} },
      { status: 200, body: { type: "response", response: { parameters: { uri } } }, cookies: {} },
    ]);
    const stop = await beginRemoteLogin(exchange, input);
    expect(stop.step).toBe("tokens");
    if (stop.step === "tokens") expect(stop.tokens.accessToken).toBe("aaa");
    expect(JSON.stringify(stop)).not.toContain(PASSWORD);
  });

  it("keeps the code screen when the code is rejected and continues when it is accepted", async () => {
    const rejected = scripted([{ status: 200, body: { type: "multifactor", error: "invalid_code" }, cookies: {} }]);
    expect((await continueRemoteLogin(rejected.exchange, { ssid: "cookie" }, "000000")).step).toBe("invalid-code");
    const accepted = scripted([
      { status: 200, body: { type: "success", success: { login_token: "lt" } }, cookies: {} },
      { status: 200, body: {}, cookies: {} },
      { status: 200, body: { type: "response", response: { parameters: { uri } } }, cookies: {} },
    ]);
    const stop = await continueRemoteLogin(accepted.exchange, { ssid: "cookie" }, "123456");
    expect(stop.step).toBe("tokens");
  });
});
