import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { stub } from "@std/testing/mock";
import { createDiscogsClient } from "@/discogs-client.ts";
import type {
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
});

const createErrorResponse = (
  type: string,
  message: string,
  statusCode?: number,
): ProxyResponse => ({
  success: false,
  error: { type, message, statusCode },
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
