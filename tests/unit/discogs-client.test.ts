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

Deno.test("DiscogsClient - returns RATE_LIMIT_ERROR for 429 response", async () => {
  const fetchStub = stub(
    globalThis,
    "fetch",
    () => Promise.resolve(new Response("Too Many Requests", { status: 429 })),
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
