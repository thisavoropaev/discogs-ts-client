import type { RateLimitInfo } from "./types/common.ts";

function parseNonNegativeInt(
  value: string | null,
  defaultValue: number,
): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed < 0 ? defaultValue : parsed;
}

export function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  return {
    limit: parseNonNegativeInt(headers.get("x-discogs-ratelimit"), 60),
    used: parseNonNegativeInt(headers.get("x-discogs-ratelimit-used"), 0),
    remaining: parseNonNegativeInt(
      headers.get("x-discogs-ratelimit-remaining"),
      60,
    ),
  };
}
