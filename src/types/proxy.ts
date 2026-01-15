import type {
  DiscogsApiErrorType,
  HttpMethod,
  RateLimitInfo,
} from "./common.ts";

export type UserCredentials = {
  token: string;
  tokenSecret: string;
};

export type ProxyConfig = {
  url: string;
};

export type ProxyRequestBody = {
  method: HttpMethod;
  endpoint: string;
  pathParams?: Record<string, string | number>;
  queryParams?: Record<string, string | number | boolean>;
  userCredentials?: UserCredentials;
  oauthParams?: Record<string, string>;
};

export type ProxyErrorPayload = {
  type: DiscogsApiErrorType;
  message: string;
  statusCode?: number;
};

export type ProxyResponse<T = unknown> =
  | { success: true; data: T; rateLimit: RateLimitInfo }
  | { success: false; error: ProxyErrorPayload };
