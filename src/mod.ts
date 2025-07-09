export { createDiscogsClient } from "./discogs-client.ts";
export { createAuthorizationHeader } from "./auth.ts";
export { createProxyHandler } from "./handlers/mod.ts";

export type { DiscogsClient, DiscogsClientConfig } from "./types/client.ts";
export type * from "./types/endpoint-response-map.ts";
export type * from "./types/endpoints/mod.ts";
