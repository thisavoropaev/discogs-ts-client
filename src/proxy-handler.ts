import { createDiscogsClient } from "./discogs-client.ts";
import type { ProxyRequestBody, ProxyResponse } from "./types/mod.ts";

export type ProxyHandlerConfig = {
  consumerKey: string;
  consumerSecret: string;
  userAgent: string;
  allowedOrigins?: string[];
};

export type ProxyHandler = (request: Request) => Promise<Response>;

export const createProxyHandler = (
  config: ProxyHandlerConfig,
): ProxyHandler => {
  return async (request: Request): Promise<Response> => {
    const origin = request.headers.get("Origin");
    const corsHeaders = getCorsHeaders(origin, config.allowedOrigins);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (!isOriginAllowed(origin, config.allowedOrigins)) {
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return jsonResponse(
        {
          success: false,
          error: { type: "VALIDATION_ERROR", message: "Method not allowed" },
        },
        corsHeaders,
      );
    }

    let body: ProxyRequestBody;
    try {
      body = (await request.json()) as ProxyRequestBody;
    } catch (error) {
      const parseError = error instanceof Error
        ? error.message
        : "Unknown error";
      return jsonResponse(
        {
          success: false,
          error: {
            type: "VALIDATION_ERROR",
            message: `Invalid JSON body: ${parseError}`,
          },
        },
        corsHeaders,
      );
    }

    const validMethods = ["GET", "POST", "PUT", "DELETE"];
    if (!validMethods.includes(body.method)) {
      return jsonResponse(
        {
          success: false,
          error: {
            type: "VALIDATION_ERROR",
            message: `Invalid HTTP method: "${body.method}". Allowed: ${
              validMethods.join(", ")
            }`,
          },
        },
        corsHeaders,
      );
    }

    if (!body.endpoint || typeof body.endpoint !== "string") {
      return jsonResponse(
        {
          success: false,
          error: { type: "VALIDATION_ERROR", message: "Endpoint is required" },
        },
        corsHeaders,
      );
    }

    const isRequestToken = body.endpoint === "/oauth/request_token";
    const isAccessToken = body.endpoint === "/oauth/access_token";

    if (
      isAccessToken &&
      (!body.userCredentials?.token || !body.userCredentials?.tokenSecret)
    ) {
      return jsonResponse(
        {
          success: false,
          error: {
            type: "AUTH_ERROR",
            message: "User credentials required for access_token",
          },
        },
        corsHeaders,
      );
    }

    const client = createDiscogsClient({
      credentials: {
        consumerKey: config.consumerKey,
        consumerSecret: config.consumerSecret,
        token: isRequestToken ? undefined : body.userCredentials?.token,
        tokenSecret: isRequestToken
          ? undefined
          : body.userCredentials?.tokenSecret,
      },
      userAgent: config.userAgent,
    });

    try {
      const result = await client.request({
        method: body.method as "GET" | "POST" | "PUT" | "DELETE",
        endpoint: body.endpoint,
        pathParams: toStringRecord(body.pathParams),
        queryParams: toStringRecord(body.queryParams),
        oauthParams: body.oauthParams,
      });

      if (result.isOk()) {
        return jsonResponse(
          {
            success: true,
            data: result.value.data,
            rateLimit: result.value.rateLimit,
          },
          corsHeaders,
        );
      }

      return jsonResponse(
        {
          success: false,
          error: {
            type: result.error.type,
            message: result.error.message,
            statusCode: result.error.statusCode,
          },
        },
        corsHeaders,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal error";
      return jsonResponse(
        {
          success: false,
          error: { type: "VALIDATION_ERROR", message },
        },
        corsHeaders,
      );
    }
  };
};

function isOriginAllowed(
  origin: string | null,
  allowedOrigins?: string[],
): boolean {
  const allowed = allowedOrigins ?? ["*"];
  return allowed.includes("*") || (origin !== null && allowed.includes(origin));
}

function getCorsHeaders(
  origin: string | null,
  allowedOrigins?: string[],
): Record<string, string> {
  const isAllowed = isOriginAllowed(origin, allowedOrigins);

  return {
    "Access-Control-Allow-Origin": isAllowed ? (origin ?? "*") : "",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(
  data: ProxyResponse,
  headers: Record<string, string>,
  status?: number,
): Response {
  let responseStatus = status ?? 200;

  if (!data.success && !status) {
    switch (data.error.type) {
      case "AUTH_ERROR":
        responseStatus = 401;
        break;
      case "VALIDATION_ERROR":
        responseStatus = 400;
        break;
      case "RATE_LIMIT_ERROR":
        responseStatus = 429;
        break;
      default:
        responseStatus = data.error.statusCode ?? 500;
    }
  }

  return new Response(JSON.stringify(data), {
    status: responseStatus,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

function toStringRecord(
  record?: Record<string, string | number | boolean>,
): Record<string, string> | undefined {
  if (!record) return undefined;
  return Object.fromEntries(
    Object.entries(record).map(([k, v]) => [k, String(v)]),
  );
}
