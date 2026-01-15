import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { createOAuthFlow } from "@/oauth-flow.ts";

const TEST_CONFIG = {
  consumerKey: "test-key",
  consumerSecret: "test-secret",
  userAgent: "TestApp/1.0",
};

Deno.test("OAuth Flow - createOAuthFlow returns object with methods", () => {
  const flow = createOAuthFlow(TEST_CONFIG);

  assertExists(flow.getRequestToken);
  assertExists(flow.getAuthorizeUrl);
  assertExists(flow.getAccessToken);
  assertEquals(typeof flow.getRequestToken, "function");
  assertEquals(typeof flow.getAuthorizeUrl, "function");
  assertEquals(typeof flow.getAccessToken, "function");
});

Deno.test("OAuth Flow - getAuthorizeUrl builds correct URL", () => {
  const flow = createOAuthFlow(TEST_CONFIG);
  const url = flow.getAuthorizeUrl("abc123");

  assertEquals(
    url,
    "https://discogs.com/oauth/authorize?oauth_token=abc123",
  );
});

Deno.test("OAuth Flow - getAuthorizeUrl handles special chars", () => {
  const flow = createOAuthFlow(TEST_CONFIG);
  const url = flow.getAuthorizeUrl("token+with=chars");

  assertStringIncludes(url, "oauth_token=token+with=chars");
});

Deno.test("OAuth Flow - getRequestToken returns network error on fetch fail", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new Error("Network down"));

  try {
    const flow = createOAuthFlow(TEST_CONFIG);
    const result = await flow.getRequestToken("http://example.com/callback");

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "NETWORK_ERROR");
      assertEquals(result.error.message, "Network down");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("OAuth Flow - getRequestToken handles 401 error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response("Invalid consumer", { status: 401 }),
    );

  try {
    const flow = createOAuthFlow(TEST_CONFIG);
    const result = await flow.getRequestToken("http://example.com/callback");

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "AUTH_ERROR");
      assertEquals(result.error.statusCode, 401);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("OAuth Flow - getRequestToken parses valid response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        "oauth_token=abc123&oauth_token_secret=xyz789&oauth_callback_confirmed=true",
        {
          status: 200,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        },
      ),
    );

  try {
    const flow = createOAuthFlow(TEST_CONFIG);
    const result = await flow.getRequestToken("http://example.com/callback");

    assertEquals(result.isOk(), true);
    if (result.isOk()) {
      assertEquals(result.value.oauth_token, "abc123");
      assertEquals(result.value.oauth_token_secret, "xyz789");
      assertEquals(result.value.oauth_callback_confirmed, "true");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("OAuth Flow - getRequestToken handles parse error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response("invalid_response_no_token", { status: 200 }),
    );

  try {
    const flow = createOAuthFlow(TEST_CONFIG);
    const result = await flow.getRequestToken("http://example.com/callback");

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "PARSE_ERROR");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("OAuth Flow - getAccessToken handles 401 error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response("Invalid verifier", { status: 401 }),
    );

  try {
    const flow = createOAuthFlow(TEST_CONFIG);
    const result = await flow.getAccessToken("token", "secret", "verifier");

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "AUTH_ERROR");
      assertEquals(result.error.statusCode, 401);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("OAuth Flow - getAccessToken parses valid response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        "oauth_token=access123&oauth_token_secret=secret456",
        { status: 200 },
      ),
    );

  try {
    const flow = createOAuthFlow(TEST_CONFIG);
    const result = await flow.getAccessToken(
      "request_token",
      "request_secret",
      "verifier123",
    );

    assertEquals(result.isOk(), true);
    if (result.isOk()) {
      assertEquals(result.value.oauth_token, "access123");
      assertEquals(result.value.oauth_token_secret, "secret456");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("OAuth Flow - getAccessToken network error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new Error("Connection refused"));

  try {
    const flow = createOAuthFlow(TEST_CONFIG);
    const result = await flow.getAccessToken("token", "secret", "verifier");

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "NETWORK_ERROR");
      assertEquals(result.error.message, "Connection refused");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("OAuth Flow - handles URL-encoded response values", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        "oauth_token=abc%2B123&oauth_token_secret=xyz%3D789",
        { status: 200 },
      ),
    );

  try {
    const flow = createOAuthFlow(TEST_CONFIG);
    const result = await flow.getRequestToken("http://example.com/callback");

    assertEquals(result.isOk(), true);
    if (result.isOk()) {
      assertEquals(result.value.oauth_token, "abc+123");
      assertEquals(result.value.oauth_token_secret, "xyz=789");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
