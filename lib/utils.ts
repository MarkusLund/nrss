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
  clonedResponse.headers.set("Cache-Control", `max-age=${ttlInSeconds}`);
  clonedResponse.headers.set("Expires", new Date(Date.now() + ttlInSeconds * 1000).toUTCString());
  return clonedResponse;
};

function response(body: string, status: number, type: "json" | "xml") {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": `application/${type}`,
    },
  });
}
