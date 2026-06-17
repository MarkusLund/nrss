import { STATUS_CODE } from "$fresh/server.ts";

export function getHostUrl() {
  // Explicit override for self-hosting under a custom/renamed domain
  // (e.g. the new Deno Deploy's "<app>.<org>.deno.net" pattern).
  const explicitHostUrl = Deno.env.get("HOST_URL");
  if (explicitHostUrl) {
    return explicitHostUrl;
  }
  const deploymentId = Deno.env.get("DENO_DEPLOYMENT_ID");
  const tunnelUrl = Deno.env.get("TUNNEL_URL");
  if (deploymentId) {
    return `https://nrss-${deploymentId}.deno.dev`;
  } else if (tunnelUrl) {
    return tunnelUrl;
  } else {
    return "http://localhost:8000";
  }
}

type EnumValues<T> = T[keyof T];
type Status = EnumValues<typeof STATUS_CODE>;

export function responseJSON(body: unknown | null, status: Status) {
  const stringifiedBody = JSON.stringify(body);
  return response(stringifiedBody, status, "json");
}

export function responseXML(body: string, status: Status) {
  return response(body, status, "xml");
}

export const withExpiry = <T>(response: Response, ttlInSeconds: number) => {
  const clonedResponse = response.clone();
  // `s-maxage` targets shared caches (the Deno Deploy edge CDN), `max-age`
  // covers private/browser caches. Both are set so the edge serves repeat
  // requests without invoking the isolate.
  clonedResponse.headers.set("Cache-Control", `max-age=${ttlInSeconds}, s-maxage=${ttlInSeconds}`);
  clonedResponse.headers.set("Expires", new Date(Date.now() + ttlInSeconds * 1000).toUTCString());
  return clonedResponse;
};

// Deno's Web Cache API does not honor `Expires`/`Cache-Control` for expiry,
// so we check the `Expires` header manually before serving a cached response.
// See: https://github.com/denoland/deno/issues/25795
export function isExpired(headers: Headers) {
  const expiresHeader = headers.get("Expires");
  if (!expiresHeader) {
    console.log("No Expires header found, treating as expired");
    return true;
  }

  const now = new Date();
  const expiryDate = new Date(expiresHeader);
  return now > expiryDate;
}

/**
 * Read-through HTTP cache backed by the Web Cache API.
 *
 * Returns a cached response when present and unexpired; otherwise calls
 * `produce`, stores the result with the given TTL, and returns it. `produce`
 * may return `null` to signal "not found" — nothing is cached and `null` is
 * returned so the caller can build its own error response.
 */
export async function withHttpCache(
  cacheKey: string,
  request: Request,
  ttlInSeconds: number,
  produce: () => Promise<Response | null>,
): Promise<Response | null> {
  const cache = await caches.open(cacheKey);
  const cached = await cache.match(request);
  if (cached && !isExpired(cached.headers)) {
    return cached;
  }

  const fresh = await produce();
  if (!fresh) {
    return null;
  }

  const response = withExpiry(fresh, ttlInSeconds);
  await cache.put(request, response.clone());
  return response;
}

function response(body: string, status: number, type: "json" | "xml") {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": `application/${type}`,
    },
  });
}
