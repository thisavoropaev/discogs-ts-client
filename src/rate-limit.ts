import type { RateLimitInfo } from "./types/common.ts";

export function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  const limit = headers.get("x-discogs-ratelimit");
  const used = headers.get("x-discogs-ratelimit-used");
  const remaining = headers.get("x-discogs-ratelimit-remaining");

  return {
    limit: limit ? parseInt(limit, 10) : 60,
    used: used ? parseInt(used, 10) : 0,
    remaining: remaining ? parseInt(remaining, 10) : 60,
  };
}
