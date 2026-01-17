export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface RateLimitInfo {
  limit: number;
  used: number;
  remaining: number;
}

export type DiscogsApiErrorType =
  | "NETWORK_ERROR"
  | "AUTH_ERROR"
  | "API_ERROR"
  | "VALIDATION_ERROR"
  | "PARSE_ERROR"
  | "RATE_LIMIT_ERROR";

export type DiscogsApiError = {
  type: DiscogsApiErrorType;
  message: string;
  statusCode?: number;
  details?: unknown;
  rateLimit?: RateLimitInfo;
};

export type QueryParams = Record<string, string>;
