import { assertEquals } from "@std/assert";
import { parseRateLimitHeaders } from "@/rate-limit.ts";

Deno.test("parseRateLimitHeaders - parses valid rate limit headers", () => {
  const headers = new Headers({
    "x-discogs-ratelimit": "60",
    "x-discogs-ratelimit-used": "15",
    "x-discogs-ratelimit-remaining": "45",
  });

  const result = parseRateLimitHeaders(headers);

  assertEquals(result, {
    limit: 60,
    used: 15,
    remaining: 45,
  });
});

Deno.test("parseRateLimitHeaders - returns defaults when headers are missing", () => {
  const headers = new Headers();

  const result = parseRateLimitHeaders(headers);

  assertEquals(result, {
    limit: 60,
    used: 0,
    remaining: 60,
  });
});

Deno.test("parseRateLimitHeaders - handles partial headers", () => {
  const headers = new Headers({
    "x-discogs-ratelimit": "30",
  });

  const result = parseRateLimitHeaders(headers);

  assertEquals(result, {
    limit: 30,
    used: 0,
    remaining: 60,
  });
});

Deno.test("parseRateLimitHeaders - handles zero values", () => {
  const headers = new Headers({
    "x-discogs-ratelimit": "60",
    "x-discogs-ratelimit-used": "60",
    "x-discogs-ratelimit-remaining": "0",
  });

  const result = parseRateLimitHeaders(headers);

  assertEquals(result, {
    limit: 60,
    used: 60,
    remaining: 0,
  });
});
