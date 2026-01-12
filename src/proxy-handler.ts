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
    } catch {
      return jsonResponse(
        {
          success: false,
          error: { type: "VALIDATION_ERROR", message: "Invalid JSON body" },
        },
        corsHeaders,
      );
    }

    if (!body.userCredentials?.token || !body.userCredentials?.tokenSecret) {
      return jsonResponse(
        {
          success: false,
          error: { type: "AUTH_ERROR", message: "User credentials required" },
        },
        corsHeaders,
      );
    }

    const client = createDiscogsClient({
      credentials: {
        consumerKey: config.consumerKey,
        consumerSecret: config.consumerSecret,
        token: body.userCredentials.token,
        tokenSecret: body.userCredentials.tokenSecret,
      },
      userAgent: config.userAgent,
    });

    const result = await client.request({
      method: body.method as "GET" | "POST" | "PUT" | "DELETE",
      endpoint: body.endpoint,
      pathParams: toStringRecord(body.pathParams),
      queryParams: toStringRecord(body.queryParams),
    });

    if (result.isOk()) {
      return jsonResponse({ success: true, data: result.value }, corsHeaders);
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
): Response {
  return new Response(JSON.stringify(data), {
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
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    result[key] = String(value);
  }
  return result;
}
