import type { DiscogsApiError } from "./types/mod.ts";

export function getApiErrorType(status: number): DiscogsApiError["type"] {
  if (status === 401) return "AUTH_ERROR";
  if (status === 429) return "RATE_LIMIT_ERROR";
  if (status >= 400 && status < 500) return "VALIDATION_ERROR";
  return "API_ERROR";
}
