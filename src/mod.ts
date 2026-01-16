export { createDiscogsClient } from "./discogs-client.ts";
export { createAuthorizationHeader } from "./auth.ts";
export {
  createProxyHandler,
  type ProxyHandler,
  type ProxyHandlerConfig,
} from "./proxy-handler.ts";
export { createOAuthFlow } from "./oauth-flow.ts";
export { getAuthorizeUrl } from "./oauth-urls.ts";
export { parseFormUrlEncoded } from "./parse-form-urlencoded.ts";
export {
  type AccessTokenResult,
  getAccessTokenViaProxy,
  getRequestTokenViaProxy,
  type RequestTokenResult,
} from "./proxy-oauth.ts";

export type {
  DirectModeConfig,
  DiscogsClient,
  DiscogsClientConfig,
  DiscogsResponse,
  ProxyModeConfig,
} from "./types/client.ts";
export type {
  DiscogsApiError,
  DiscogsApiErrorType,
  RateLimitInfo,
} from "./types/common.ts";
export type {
  ProxyConfig,
  ProxyErrorPayload,
  ProxyRequestBody,
  ProxyResponse,
  UserCredentials,
} from "./types/proxy.ts";
export type * from "./types/endpoints/mod.ts";
