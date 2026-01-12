import {
  createAuthorizationHeader,
  type ProxyRequestBody,
  type ProxyResponse,
  type RateLimitInfo,
} from "@thisavoropaev/discogs-ts-client";

export interface Env {
  DISCOGS_CONSUMER_KEY: string;
  DISCOGS_CONSUMER_SECRET: string;
  USER_AGENT: string;
  ALLOWED_ORIGINS?: string;
}

const DISCOGS_API_URL = "https://api.discogs.com";

const corsHeaders = (origin: string | null, allowedOrigins?: string) => {
  const allowed = allowedOrigins?.split(",").map((o) => o.trim()) ?? ["*"];
  const isAllowed = allowed.includes("*") ||
    (origin && allowed.includes(origin));

  return {
    "Access-Control-Allow-Origin": isAllowed ? (origin ?? "*") : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const headers = corsHeaders(origin, env.ALLOWED_ORIGINS);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (request.method !== "POST") {
      return jsonResponse(
        {
          success: false,
          error: { type: "VALIDATION_ERROR", message: "Method not allowed" },
        } as ProxyResponse,
        405,
        headers,
      );
    }

    let body: ProxyRequestBody;
    try {
      body = (await request.json()) as ProxyRequestBody;
    } catch {
      return jsonResponse(
        {
          success: false,
          error: { type: "VALIDATION_ERROR", message: "Invalid JSON body" },
        } as ProxyResponse,
        400,
        headers,
      );
    }

    if (!body.userCredentials?.token || !body.userCredentials?.tokenSecret) {
      return jsonResponse(
        {
          success: false,
          error: {
            type: "AUTH_ERROR",
            message: "User credentials required",
          },
        } as ProxyResponse,
        400,
        headers,
      );
    }

    const path = buildPath(body.endpoint, body.pathParams);
    const baseUrl = `${DISCOGS_API_URL}/${path.replace(/^\//, "")}`;
    const requestUrl = buildRequestUrl(baseUrl, body.queryParams);

    const credentials = {
      consumerKey: env.DISCOGS_CONSUMER_KEY,
      consumerSecret: env.DISCOGS_CONSUMER_SECRET,
      token: body.userCredentials.token,
      tokenSecret: body.userCredentials.tokenSecret,
    };

    const authHeaderResult = await createAuthorizationHeader({
      credentials,
      method: body.method,
      url: baseUrl,
      parameters: body.queryParams,
    });

    if (authHeaderResult.isErr()) {
      return jsonResponse(
        {
          success: false,
          error: {
            type: "AUTH_ERROR",
            message: authHeaderResult.error.message,
          },
        } as ProxyResponse,
        500,
        headers,
      );
    }

    const discogsHeaders = {
      "User-Agent": env.USER_AGENT,
      Authorization: authHeaderResult.value,
    };

    try {
      const response = await fetch(requestUrl, {
        method: body.method,
        headers: discogsHeaders,
      });

      const rateLimit = parseRateLimitHeaders(response.headers);

      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        return jsonResponse(
          {
            success: false,
            error: {
              type: getErrorType(response.status),
              message: text || response.statusText,
              statusCode: response.status,
            },
          } as ProxyResponse,
          200,
          {
            ...headers,
            ...(response.status === 429 && response.headers.has("Retry-After")
              ? { "Retry-After": response.headers.get("Retry-After")! }
              : {}),
          },
        );
      }

      const data = await response.json();
      return jsonResponse(
        { success: true, data, rateLimit } as ProxyResponse,
        200,
        headers,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return jsonResponse(
        {
          success: false,
          error: {
            type: "NETWORK_ERROR",
            message: `Discogs API request failed: ${message}`,
          },
        } as ProxyResponse,
        500,
        headers,
      );
    }
  },
};

function buildPath(
  endpoint: string,
  pathParams?: Record<string, string | number>,
): string {
  if (!pathParams) return endpoint;
  return Object.entries(pathParams).reduce(
    (path, [key, value]) => path.replace(`{${key}}`, String(value)),
    endpoint,
  );
}

function buildRequestUrl(
  baseUrl: string,
  queryParams?: Record<string, string | number | boolean>,
): string {
  if (!queryParams || Object.keys(queryParams).length === 0) {
    return baseUrl;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams)) {
    params.append(key, String(value));
  }
  return `${baseUrl}?${params.toString()}`;
}

function parseRateLimitHeaders(headers: Headers): RateLimitInfo | undefined {
  const limit = headers.get("X-Discogs-Ratelimit");
  const remaining = headers.get("X-Discogs-Ratelimit-Remaining");
  const used = headers.get("X-Discogs-Ratelimit-Used");

  if (!limit || !remaining || !used) return undefined;

  const retryAfter = headers.get("Retry-After");

  return {
    limit: parseInt(limit, 10),
    remaining: parseInt(remaining, 10),
    used: parseInt(used, 10),
    ...(retryAfter ? { retryAfter: parseInt(retryAfter, 10) } : {}),
  };
}

function getErrorType(
  status: number,
): string {
  if (status === 401) return "AUTH_ERROR";
  if (status === 429) return "RATE_LIMIT_ERROR";
  if (status >= 400 && status < 500) return "VALIDATION_ERROR";
  return "API_ERROR";
}

function jsonResponse(
  data: ProxyResponse,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}
