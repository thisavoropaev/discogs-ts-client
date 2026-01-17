import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { stub } from "@std/testing/mock";
import { createDiscogsClient } from "@/discogs-client.ts";
import type {
  DiscogsApiErrorType,
  ProxyModeConfig,
  ProxyRequestBody,
  ProxyResponse,
} from "@/types/mod.ts";

type FetchFn = typeof globalThis.fetch;

const createProxyConfig = (): ProxyModeConfig => ({
  mode: "proxy",
  proxy: {
    url: "https://proxy.example.com/discogs",
  },
  userCredentials: {
    token: "user-token",
    tokenSecret: "user-token-secret",
  },
});

const createSuccessResponse = <T>(data: T): ProxyResponse<T> => ({
  success: true,
  data,
  rateLimit: { limit: 60, used: 1, remaining: 59 },
});

const createErrorResponse = (
  type: DiscogsApiErrorType,
  message: string,
  statusCode?: number,
  rateLimit?: { limit: number; used: number; remaining: number },
): ProxyResponse => ({
  success: false,
  error: { type, message, statusCode, rateLimit },
});

// deno-lint-ignore no-explicit-any
const mockFetch = (fn: (...args: any[]) => Promise<Response>): FetchFn =>
  fn as FetchFn;

Deno.test("ProxyClient - initialization", () => {
  const config = createProxyConfig();
  const client = createDiscogsClient(config);

  assertExists(client);
  assertExists(client.request);
});

Deno.test("ProxyClient - forms correct request body", async () => {
  const config = createProxyConfig();
  const client = createDiscogsClient(config);

  let capturedBody: ProxyRequestBody | undefined;

  const fetchStub = stub(
    globalThis,
    "fetch",
    mockFetch((_input, init) => {
      capturedBody = JSON.parse(init?.body as string) as ProxyRequestBody;
      return Promise.resolve(
        new Response(JSON.stringify(createSuccessResponse({})), {
          status: 200,
        }),
      );
    }),
  );

  try {
    await client.request({
      method: "GET",
      endpoint: "/releases/{release_id}",
      pathParams: { release_id: "249504" },
      queryParams: { curr_abbr: "USD" },
    });

    assertExists(capturedBody);
    const body = capturedBody as ProxyRequestBody;
    assertEquals(body.method, "GET");
    assertEquals(body.endpoint, "/releases/{release_id}");
    assertEquals(body.pathParams, { release_id: "249504" });
    assertEquals(body.queryParams, { curr_abbr: "USD" });
    assertEquals(body.userCredentials, {
      token: "user-token",
      tokenSecret: "user-token-secret",
    });
  } finally {
    fetchStub.restore();
  }
});

Deno.test("ProxyClient - sends POST to proxy URL", async () => {
  const config: ProxyModeConfig = {
    mode: "proxy",
    proxy: { url: "https://my-worker.com/api" },
    userCredentials: { token: "t", tokenSecret: "ts" },
  };
  const client = createDiscogsClient(config);

  let capturedUrl: string | null = null;
  let capturedMethod: string | null = null;

  const fetchStub = stub(
    globalThis,
    "fetch",
    mockFetch((input, init) => {
      capturedUrl = input.toString();
      capturedMethod = init?.method ?? "GET";
      return Promise.resolve(
        new Response(JSON.stringify(createSuccessResponse({})), {
          status: 200,
        }),
      );
    }),
  );

  try {
    await client.request({
      method: "GET",
      endpoint: "/releases/{release_id}",
      pathParams: { release_id: "249504" },
    });

    assertEquals(capturedUrl, "https://my-worker.com/api");
    assertEquals(capturedMethod, "POST");
  } finally {
    fetchStub.restore();
  }
});

Deno.test("ProxyClient - handles network error", async () => {
  const config = createProxyConfig();
  const client = createDiscogsClient(config);

  const fetchStub = stub(
    globalThis,
    "fetch",
    mockFetch(() => Promise.reject(new Error("Connection refused"))),
  );

  try {
    const result = await client.request({
      method: "GET",
      endpoint: "/releases/{release_id}",
      pathParams: { release_id: "249504" },
    });

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "NETWORK_ERROR");
      assertStringIncludes(result.error.message, "Connection refused");
    }
  } finally {
    fetchStub.restore();
  }
});

Deno.test("ProxyClient - handles invalid JSON from proxy", async () => {
  const config = createProxyConfig();
  const client = createDiscogsClient(config);

  const fetchStub = stub(
    globalThis,
    "fetch",
    mockFetch(() => Promise.resolve(new Response("not valid json"))),
  );

  try {
    const result = await client.request({
      method: "GET",
      endpoint: "/releases/{release_id}",
      pathParams: { release_id: "249504" },
    });

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "PARSE_ERROR");
    }
  } finally {
    fetchStub.restore();
  }
});

Deno.test("ProxyClient - returns error from proxy response", async () => {
  const config = createProxyConfig();
  const client = createDiscogsClient(config);

  const fetchStub = stub(
    globalThis,
    "fetch",
    mockFetch(() =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            createErrorResponse("AUTH_ERROR", "Invalid token", 401),
          ),
        ),
      )
    ),
  );

  try {
    const result = await client.request({
      method: "GET",
      endpoint: "/releases/{release_id}",
      pathParams: { release_id: "249504" },
    });

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "AUTH_ERROR");
      assertEquals(result.error.message, "Invalid token");
      assertEquals(result.error.statusCode, 401);
    }
  } finally {
    fetchStub.restore();
  }
});

Deno.test("ProxyClient - maps unknown error type to API_ERROR", async () => {
  const config = createProxyConfig();
  const client = createDiscogsClient(config);

  const fetchStub = stub(
    globalThis,
    "fetch",
    mockFetch(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            success: false,
            error: { type: "UNKNOWN_ERROR", message: "Something weird" },
          }),
        ),
      )
    ),
  );

  try {
    const result = await client.request({
      method: "GET",
      endpoint: "/releases/{release_id}",
      pathParams: { release_id: "249504" },
    });

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "API_ERROR");
      assertEquals(result.error.message, "Something weird");
    }
  } finally {
    fetchStub.restore();
  }
});

Deno.test("ProxyClient - handles proxy server 5xx error", async () => {
  const config = createProxyConfig();
  const client = createDiscogsClient(config);

  const fetchStub = stub(
    globalThis,
    "fetch",
    mockFetch(() =>
      Promise.resolve(
        new Response("Internal Server Error", { status: 502 }),
      )
    ),
  );

  try {
    const result = await client.request({
      method: "GET",
      endpoint: "/releases/{release_id}",
      pathParams: { release_id: "249504" },
    });

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "NETWORK_ERROR");
      assertEquals(result.error.statusCode, 502);
      assertStringIncludes(result.error.message, "Proxy server error");
    }
  } finally {
    fetchStub.restore();
  }
});

Deno.test("ProxyClient - handles proxy 401 error", async () => {
  const config = createProxyConfig();
  const client = createDiscogsClient(config);

  const fetchStub = stub(
    globalThis,
    "fetch",
    mockFetch(() =>
      Promise.resolve(new Response("Unauthorized", { status: 401 }))
    ),
  );

  try {
    const result = await client.request({
      method: "GET",
      endpoint: "/releases/{release_id}",
      pathParams: { release_id: "249504" },
    });

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "AUTH_ERROR");
      assertEquals(result.error.statusCode, 401);
    }
  } finally {
    fetchStub.restore();
  }
});

Deno.test("ProxyClient - handles proxy 404 error", async () => {
  const config = createProxyConfig();
  const client = createDiscogsClient(config);

  const fetchStub = stub(
    globalThis,
    "fetch",
    mockFetch(() =>
      Promise.resolve(new Response("Not Found", { status: 404 }))
    ),
  );

  try {
    const result = await client.request({
      method: "GET",
      endpoint: "/releases/{release_id}",
      pathParams: { release_id: "249504" },
    });

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "VALIDATION_ERROR");
      assertEquals(result.error.statusCode, 404);
    }
  } finally {
    fetchStub.restore();
  }
});

Deno.test("ProxyClient - handles proxy 429 error", async () => {
  const config = createProxyConfig();
  const client = createDiscogsClient(config);

  const fetchStub = stub(
    globalThis,
    "fetch",
    mockFetch(() =>
      Promise.resolve(new Response("Too Many Requests", { status: 429 }))
    ),
  );

  try {
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

Deno.test("ProxyClient - includes rateLimit in error from proxy response", async () => {
  const config = createProxyConfig();
  const client = createDiscogsClient(config);

  const rateLimit = { limit: 60, used: 60, remaining: 0 };
  const fetchStub = stub(
    globalThis,
    "fetch",
    mockFetch(() =>
      Promise.resolve(
        new Response(
          JSON.stringify(
            createErrorResponse(
              "RATE_LIMIT_ERROR",
              "Rate limit exceeded",
              429,
              rateLimit,
            ),
          ),
          { status: 429 },
        ),
      )
    ),
  );

  try {
    const result = await client.request({
      method: "GET",
      endpoint: "/releases/{release_id}",
      pathParams: { release_id: "249504" },
    });

    assertEquals(result.isErr(), true);
    if (result.isErr()) {
      assertEquals(result.error.type, "RATE_LIMIT_ERROR");
      assertEquals(result.error.statusCode, 429);
      assertEquals(result.error.rateLimit, rateLimit);
    }
  } finally {
    fetchStub.restore();
  }
});
