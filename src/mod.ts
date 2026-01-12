export { createDiscogsClient } from "./discogs-client.ts";
export { createAuthorizationHeader } from "./auth.ts";
export {
  createProxyHandler,
  type ProxyHandler,
  type ProxyHandlerConfig,
} from "./proxy-handler.ts";

export type {
  DirectModeConfig,
  DiscogsClient,
  DiscogsClientConfig,
  ProxyModeConfig,
} from "./types/client.ts";
export type {
  ProxyConfig,
  ProxyErrorPayload,
  ProxyRequestBody,
  ProxyResponse,
  RateLimitInfo,
  UserCredentials,
} from "./types/proxy.ts";
export type * from "./types/endpoints/mod.ts";
