import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  getAccessTokenViaProxy,
  getRequestTokenViaProxy,
} from "../../src/proxy-oauth.ts";

Deno.test("getRequestTokenViaProxy - success", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          data: { oauth_token: "token123", oauth_token_secret: "secret123" },
          rateLimit: { used: 1, remaining: 59, limit: 60, reset: 60 },
        }),
        { status: 200 },
      ),
    );

  try {
    const result = await getRequestTokenViaProxy(
      "http://proxy",
      "http://callback",
    );
    assertEquals(result.isOk(), true);
    if (result.isOk()) {
      assertEquals(result.value.requestToken, "token123");
      assertEquals(result.value.requestTokenSecret, "secret123");
      assertStringIncludes(result.value.authorizeUrl, "oauth_token=token123");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getRequestTokenViaProxy - network error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new Error("Connection refused"));

  try {
    const result = await getRequestTokenViaProxy(
      "http://proxy",
      "http://callback",
    );
    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "NETWORK_ERROR");
      assertStringIncludes(result.error.message, "Connection refused");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getRequestTokenViaProxy - proxy error response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: false,
          error: { type: "AUTH_ERROR", message: "Invalid consumer key" },
        }),
        { status: 200 },
      ),
    );

  try {
    const result = await getRequestTokenViaProxy(
      "http://proxy",
      "http://callback",
    );
    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "AUTH_ERROR");
      assertEquals(result.error.message, "Invalid consumer key");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getRequestTokenViaProxy - 500 server error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(new Response("Internal Server Error", { status: 500 }));

  try {
    const result = await getRequestTokenViaProxy(
      "http://proxy",
      "http://callback",
    );
    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "NETWORK_ERROR");
      assertEquals(result.error.statusCode, 500);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getRequestTokenViaProxy - parse error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(new Response("not json", { status: 200 }));

  try {
    const result = await getRequestTokenViaProxy(
      "http://proxy",
      "http://callback",
    );
    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "PARSE_ERROR");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getAccessTokenViaProxy - success", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          data: { oauth_token: "access123", oauth_token_secret: "secret456" },
          rateLimit: { used: 1, remaining: 59, limit: 60, reset: 60 },
        }),
        { status: 200 },
      ),
    );

  try {
    const result = await getAccessTokenViaProxy(
      "http://proxy",
      "reqToken",
      "reqSecret",
      "verifier123",
    );
    assertEquals(result.isOk(), true);
    if (result.isOk()) {
      assertEquals(result.value.accessToken, "access123");
      assertEquals(result.value.accessTokenSecret, "secret456");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getAccessTokenViaProxy - network error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.reject(new Error("Network timeout"));

  try {
    const result = await getAccessTokenViaProxy(
      "http://proxy",
      "reqToken",
      "reqSecret",
      "verifier123",
    );
    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "NETWORK_ERROR");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getAccessTokenViaProxy - auth error", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: false,
          error: {
            type: "AUTH_ERROR",
            message: "Invalid verifier",
            statusCode: 401,
          },
        }),
        { status: 200 },
      ),
    );

  try {
    const result = await getAccessTokenViaProxy(
      "http://proxy",
      "reqToken",
      "reqSecret",
      "badVerifier",
    );
    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "AUTH_ERROR");
      assertEquals(result.error.statusCode, 401);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getRequestTokenViaProxy - sends correct body", async () => {
  const originalFetch = globalThis.fetch;
  let capturedBody: unknown;

  // deno-lint-ignore no-explicit-any
  globalThis.fetch = ((_url: any, init: any) => {
    capturedBody = JSON.parse(init?.body as string);
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          data: { oauth_token: "t", oauth_token_secret: "s" },
          rateLimit: { used: 1, remaining: 59, limit: 60, reset: 60 },
        }),
        { status: 200 },
      ),
    );
  }) as typeof fetch;

  try {
    await getRequestTokenViaProxy("http://proxy", "http://my-callback");
    assertEquals(capturedBody, {
      method: "POST",
      endpoint: "/oauth/request_token",
      oauthParams: { oauth_callback: "http://my-callback" },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getAccessTokenViaProxy - sends correct body", async () => {
  const originalFetch = globalThis.fetch;
  let capturedBody: unknown;

  // deno-lint-ignore no-explicit-any
  globalThis.fetch = ((_url: any, init: any) => {
    capturedBody = JSON.parse(init?.body as string);
    return Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          data: { oauth_token: "t", oauth_token_secret: "s" },
          rateLimit: { used: 1, remaining: 59, limit: 60, reset: 60 },
        }),
        { status: 200 },
      ),
    );
  }) as typeof fetch;

  try {
    await getAccessTokenViaProxy("http://proxy", "myToken", "mySecret", "v123");
    assertEquals(capturedBody, {
      method: "POST",
      endpoint: "/oauth/access_token",
      userCredentials: { token: "myToken", tokenSecret: "mySecret" },
      oauthParams: { oauth_verifier: "v123" },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getRequestTokenViaProxy - 401 returns AUTH_ERROR", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(new Response("Unauthorized", { status: 401 }));

  try {
    const result = await getRequestTokenViaProxy(
      "http://proxy",
      "http://callback",
    );
    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "AUTH_ERROR");
      assertEquals(result.error.statusCode, 401);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getRequestTokenViaProxy - 429 returns RATE_LIMIT_ERROR", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(new Response("Too Many Requests", { status: 429 }));

  try {
    const result = await getRequestTokenViaProxy(
      "http://proxy",
      "http://callback",
    );
    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "RATE_LIMIT_ERROR");
      assertEquals(result.error.statusCode, 429);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getRequestTokenViaProxy - 404 returns VALIDATION_ERROR", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(new Response("Not Found", { status: 404 }));

  try {
    const result = await getRequestTokenViaProxy(
      "http://proxy",
      "http://callback",
    );
    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "VALIDATION_ERROR");
      assertEquals(result.error.statusCode, 404);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getRequestTokenViaProxy - missing oauth_token returns PARSE_ERROR", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          data: { oauth_token_secret: "secret" },
        }),
        { status: 200 },
      ),
    );

  try {
    const result = await getRequestTokenViaProxy(
      "http://proxy",
      "http://callback",
    );
    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "PARSE_ERROR");
      assertStringIncludes(result.error.message, "missing oauth_token");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("getAccessTokenViaProxy - missing oauth_token_secret returns PARSE_ERROR", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          success: true,
          data: { oauth_token: "token" },
        }),
        { status: 200 },
      ),
    );

  try {
    const result = await getAccessTokenViaProxy(
      "http://proxy",
      "reqToken",
      "reqSecret",
      "verifier",
    );
    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "PARSE_ERROR");
      assertStringIncludes(result.error.message, "missing oauth_token");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
