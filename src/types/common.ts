export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export type DiscogsApiErrorType =
  | "NETWORK_ERROR"
  | "AUTH_ERROR"
  | "API_ERROR"
  | "VALIDATION_ERROR"
  | "PARSE_ERROR";

export type DiscogsApiError = {
  type: DiscogsApiErrorType;
  message: string;
  statusCode?: number;
  details?: unknown;
};

export type QueryParams = Record<string, string>;
