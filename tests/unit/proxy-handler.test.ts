import { assertEquals, assertStringIncludes } from "@std/assert";
import { stub } from "@std/testing/mock";
import {
  createProxyHandler,
  type ProxyHandlerConfig,
} from "@/proxy-handler.ts";
import type { ProxyRequestBody, ProxyResponse } from "@/types/mod.ts";

const createConfig = (
  overrides?: Partial<ProxyHandlerConfig>,
): ProxyHandlerConfig => ({
  consumerKey: "test-consumer-key",
  consumerSecret: "test-consumer-secret",
  userAgent: "TestApp/1.0",
  ...overrides,
});

const createValidBody = (): ProxyRequestBody => ({
  method: "GET",
  endpoint: "/releases/{release_id}",
  pathParams: { release_id: 249504 },
  userCredentials: {
    token: "user-token",
    tokenSecret: "user-token-secret",
  },
});

const createRequest = (
  method: string,
  body?: unknown,
  origin?: string,
): Request => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (origin) {
    headers["Origin"] = origin;
  }
  return new Request("https://proxy.example.com/discogs", {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
};

Deno.test("ProxyHandler - OPTIONS returns CORS headers", async () => {
  const handler = createProxyHandler(createConfig());
  const request = createRequest("OPTIONS", undefined, "https://example.com");

  const response = await handler(request);

  assertEquals(response.status, 200);
  assertEquals(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://example.com",
  );
  assertEquals(
    response.headers.get("Access-Control-Allow-Methods"),
    "POST, OPTIONS",
  );
  assertEquals(
    response.headers.get("Access-Control-Allow-Headers"),
    "Content-Type",
  );
});

Deno.test("ProxyHandler - allowed origin gets 200", async () => {
  const handler = createProxyHandler(
    createConfig({ allowedOrigins: ["https://allowed.com"] }),
  );
  const request = createRequest("OPTIONS", undefined, "https://allowed.com");

  const response = await handler(request);

  assertEquals(response.status, 200);
  assertEquals(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://allowed.com",
  );
});

Deno.test("ProxyHandler - forbidden origin gets 403", async () => {
  const handler = createProxyHandler(
    createConfig({ allowedOrigins: ["https://allowed.com"] }),
  );
  const request = createRequest(
    "POST",
    createValidBody(),
    "https://forbidden.com",
  );

  const response = await handler(request);

  assertEquals(response.status, 403);
});

Deno.test("ProxyHandler - wildcard allows any origin", async () => {
  const handler = createProxyHandler(createConfig({ allowedOrigins: ["*"] }));
  const request = createRequest("OPTIONS", undefined, "https://any-origin.com");

  const response = await handler(request);

  assertEquals(response.status, 200);
  assertEquals(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://any-origin.com",
  );
});

Deno.test("ProxyHandler - non-POST methods return VALIDATION_ERROR", async () => {
  const handler = createProxyHandler(createConfig());
  const request = createRequest("GET", undefined, "https://example.com");

  const response = await handler(request);
  const data = (await response.json()) as ProxyResponse;

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  if (!data.success) {
    assertEquals(data.error.type, "VALIDATION_ERROR");
    assertStringIncludes(data.error.message, "Method not allowed");
  }
});

Deno.test("ProxyHandler - invalid JSON body returns VALIDATION_ERROR", async () => {
  const handler = createProxyHandler(createConfig());
  const request = new Request("https://proxy.example.com/discogs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://example.com",
    },
    body: "not valid json",
  });

  const response = await handler(request);
  const data = (await response.json()) as ProxyResponse;

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  if (!data.success) {
    assertEquals(data.error.type, "VALIDATION_ERROR");
    assertStringIncludes(data.error.message, "Invalid JSON body");
  }
});

Deno.test("ProxyHandler - missing userCredentials returns AUTH_ERROR", async () => {
  const handler = createProxyHandler(createConfig());
  const body = {
    method: "GET",
    endpoint: "/releases/{release_id}",
    pathParams: { release_id: 249504 },
  };
  const request = createRequest("POST", body, "https://example.com");

  const response = await handler(request);
  const data = (await response.json()) as ProxyResponse;

  assertEquals(response.status, 401);
  assertEquals(data.success, false);
  if (!data.success) {
    assertEquals(data.error.type, "AUTH_ERROR");
    assertStringIncludes(data.error.message, "User credentials required");
  }
});

Deno.test("ProxyHandler - invalid HTTP method in body returns VALIDATION_ERROR", async () => {
  const handler = createProxyHandler(createConfig());
  const body = {
    method: "PATCH",
    endpoint: "/releases/{release_id}",
    pathParams: { release_id: 249504 },
    userCredentials: { token: "t", tokenSecret: "ts" },
  };
  const request = createRequest("POST", body, "https://example.com");

  const response = await handler(request);
  const data = (await response.json()) as ProxyResponse;

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  if (!data.success) {
    assertEquals(data.error.type, "VALIDATION_ERROR");
    assertStringIncludes(data.error.message, "Invalid HTTP method");
  }
});

Deno.test("ProxyHandler - missing endpoint returns VALIDATION_ERROR", async () => {
  const handler = createProxyHandler(createConfig());
  const body = {
    method: "GET",
    pathParams: { release_id: 249504 },
    userCredentials: { token: "t", tokenSecret: "ts" },
  };
  const request = createRequest("POST", body, "https://example.com");

  const response = await handler(request);
  const data = (await response.json()) as ProxyResponse;

  assertEquals(response.status, 400);
  assertEquals(data.success, false);
  if (!data.success) {
    assertEquals(data.error.type, "VALIDATION_ERROR");
    assertStringIncludes(data.error.message, "Endpoint is required");
  }
});

Deno.test("ProxyHandler - successful Discogs response returns success", async () => {
  const handler = createProxyHandler(createConfig());
  const request = createRequest(
    "POST",
    createValidBody(),
    "https://example.com",
  );

  const mockData = { id: 249504, title: "Test Release" };

  const fetchStub = stub(
    globalThis,
    "fetch",
    () =>
      Promise.resolve(
        new Response(JSON.stringify(mockData), {
          status: 200,
          headers: {
            "x-discogs-ratelimit": "60",
            "x-discogs-ratelimit-used": "5",
            "x-discogs-ratelimit-remaining": "55",
          },
        }),
      ),
  );

  try {
    const response = await handler(request);
    const data = (await response.json()) as ProxyResponse;

    assertEquals(response.status, 200);
    assertEquals(data.success, true);
    if (data.success) {
      assertEquals(data.data, mockData);
      assertEquals(data.rateLimit, { limit: 60, used: 5, remaining: 55 });
    }
  } finally {
    fetchStub.restore();
  }
});

Deno.test("ProxyHandler - Discogs error returns error response", async () => {
  const handler = createProxyHandler(createConfig());
  const request = createRequest(
    "POST",
    createValidBody(),
    "https://example.com",
  );

  const fetchStub = stub(
    globalThis,
    "fetch",
    () =>
      Promise.resolve(
        new Response("Not Found", { status: 404 }),
      ),
  );

  try {
    const response = await handler(request);
    const data = (await response.json()) as ProxyResponse;

    assertEquals(data.success, false);
    if (!data.success) {
      assertEquals(data.error.statusCode, 404);
    }
  } finally {
    fetchStub.restore();
  }
});

Deno.test("ProxyHandler - default allowedOrigins allows any origin", async () => {
  const handler = createProxyHandler(
    createConfig({ allowedOrigins: undefined }),
  );
  const request = createRequest("OPTIONS", undefined, "https://any-site.com");

  const response = await handler(request);

  assertEquals(response.status, 200);
  assertEquals(
    response.headers.get("Access-Control-Allow-Origin"),
    "https://any-site.com",
  );
});
