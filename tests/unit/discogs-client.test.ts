import { assertEquals, assertExists } from "@std/assert";
import { stub } from "@std/testing/mock";
import { createDiscogsClient } from "@/discogs-client.ts";
import type { DiscogsClientConfig } from "@/types/client.ts";

const testConfig: DiscogsClientConfig = {
  credentials: {
    consumerKey: "test-key",
    consumerSecret: "test-secret",
    token: "test-token",
    tokenSecret: "test-token-secret",
  },
  userAgent: "TestApp/1.0",
};

Deno.test("DiscogsClient - initialization", () => {
  const client = createDiscogsClient(testConfig);

  assertExists(client);
  assertExists(client.request);
});

Deno.test("DiscogsClient - returns RATE_LIMIT_ERROR for 429 response with rateLimit info", async () => {
  const fetchStub = stub(
    globalThis,
    "fetch",
    () =>
      Promise.resolve(
        new Response("Too Many Requests", {
          status: 429,
          headers: {
            "x-discogs-ratelimit": "60",
            "x-discogs-ratelimit-used": "60",
            "x-discogs-ratelimit-remaining": "0",
          },
        }),
      ),
  );

  try {
    const client = createDiscogsClient(testConfig);
    const result = await client.request({
      method: "GET",
      endpoint: "/releases/{release_id}",
      pathParams: { release_id: "249504" },
    });

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "RATE_LIMIT_ERROR");
      assertEquals(result.error.statusCode, 429);
      assertEquals(result.error.rateLimit, {
        limit: 60,
        used: 60,
        remaining: 0,
      });
    }
  } finally {
    fetchStub.restore();
  }
});

Deno.test("DiscogsClient - successful response includes rateLimit info", async () => {
  const fetchStub = stub(
    globalThis,
    "fetch",
    () =>
      Promise.resolve(
        new Response(JSON.stringify({ id: 249504, title: "Test Release" }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "x-discogs-ratelimit": "60",
            "x-discogs-ratelimit-used": "10",
            "x-discogs-ratelimit-remaining": "50",
          },
        }),
      ),
  );

  try {
    const client = createDiscogsClient(testConfig);
    const result = await client.request({
      method: "GET",
      endpoint: "/releases/{release_id}",
      pathParams: { release_id: "249504" },
    });

    assertEquals(result.isOk(), true);
    if (result.isOk()) {
      assertEquals(result.value.rateLimit, {
        limit: 60,
        used: 10,
        remaining: 50,
      });
      assertEquals(result.value.data.id, 249504);
    }
  } finally {
    fetchStub.restore();
  }
});

Deno.test("DiscogsClient - parses form-urlencoded response", async () => {
  const fetchStub = stub(
    globalThis,
    "fetch",
    () =>
      Promise.resolve(
        new Response(
          "oauth_token=token123&oauth_token_secret=secret456&oauth_callback_confirmed=true",
          {
            status: 200,
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "x-discogs-ratelimit": "60",
              "x-discogs-ratelimit-used": "1",
              "x-discogs-ratelimit-remaining": "59",
            },
          },
        ),
      ),
  );

  try {
    const client = createDiscogsClient(testConfig);
    const result = await client.request({
      method: "POST",
      endpoint: "/oauth/request_token",
    });

    assertEquals(result.isOk(), true);
    if (result.isOk()) {
      const data = result.value.data as Record<string, string>;
      assertEquals(data.oauth_token, "token123");
      assertEquals(data.oauth_token_secret, "secret456");
    }
  } finally {
    fetchStub.restore();
  }
});

Deno.test("DiscogsClient - returns PARSE_ERROR for empty form-urlencoded", async () => {
  const fetchStub = stub(
    globalThis,
    "fetch",
    () =>
      Promise.resolve(
        new Response("", {
          status: 200,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
      ),
  );

  try {
    const client = createDiscogsClient(testConfig);
    const result = await client.request({
      method: "POST",
      endpoint: "/oauth/request_token",
    });

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "PARSE_ERROR");
    }
  } finally {
    fetchStub.restore();
  }
});
