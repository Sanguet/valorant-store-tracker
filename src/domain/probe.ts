export interface ProbeResponse {
  status: number;
  body?: unknown;
}

export class StorefrontRequestError extends Error {
  constructor(
    message: string,
    readonly code: "unauthorized" | "bad-request" | "http" | "no-storefront",
    readonly status: number,
  ) {
    super(message);
  }
}

// v3 is attempted first because a 2024 client report said GET v2 started returning 404.
// A 404 or 405 falls through to the other version. That check happens on the request.
export async function probeStorefront(
  fetchVersion: (version: "v2" | "v3") => Promise<ProbeResponse>,
  preferred: "v2" | "v3" | null,
): Promise<{ version: "v2" | "v3"; body: unknown }> {
  const order: Array<"v2" | "v3"> = preferred === "v2" ? ["v2", "v3"] : ["v3", "v2"];
  let lastStatus = 0;
  for (const version of order) {
    const response = await fetchVersion(version);
    lastStatus = response.status;
    if (response.status === 200 && response.body) return { version, body: response.body };
    if (response.status === 404 || response.status === 405) continue;
    if (response.status === 401 || response.status === 403) {
      throw new StorefrontRequestError("Riot rechazó la sesión.", "unauthorized", response.status);
    }
    if (response.status === 400) {
      throw new StorefrontRequestError("El storefront rechazó el pedido.", "bad-request", response.status);
    }
    throw new StorefrontRequestError("El storefront no respondió.", "http", response.status);
  }
  throw new StorefrontRequestError("Ninguna versión del storefront respondió.", "no-storefront", lastStatus);
}
