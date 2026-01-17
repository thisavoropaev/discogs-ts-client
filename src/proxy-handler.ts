import { createAuthorizationHeader } from "./auth.ts";
import { buildPath, buildRequestUrl } from "./url.ts";
import { parseRateLimitHeaders } from "./rate-limit.ts";
import { getApiErrorType } from "./errors.ts";
import { parseFormUrlEncoded } from "./parse-form-urlencoded.ts";
import type {
  ProxyRequestBody,
  ProxyResponse,
  RateLimitInfo,
} from "./types/mod.ts";

const DISCOGS_API_URL = "https://api.discogs.com";

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

    const userToken = isRequestToken ? undefined : body.userCredentials?.token;
    const userTokenSecret = isRequestToken
      ? undefined
      : body.userCredentials?.tokenSecret;

    const path = buildPath(body.endpoint, toStringRecord(body.pathParams));
    const baseUrl = `${DISCOGS_API_URL}/${path.replace(/^\//, "")}`;
    const queryParams = toStringRecord(body.queryParams);
    const requestUrl = buildRequestUrl(baseUrl, queryParams);

    const authResult = await createAuthorizationHeader({
      credentials: {
        consumerKey: config.consumerKey,
        consumerSecret: config.consumerSecret,
        token: userToken,
        tokenSecret: userTokenSecret,
      },
      method: body.method,
      url: baseUrl,
      parameters: queryParams,
      oauthParams: body.oauthParams,
    });

    if (authResult.isErr()) {
      return jsonResponse(
        {
          success: false,
          error: { type: "AUTH_ERROR", message: authResult.error.message },
        },
        corsHeaders,
      );
    }

    let response: Response;
    try {
      response = await fetch(requestUrl, {
        method: body.method,
        headers: {
          "User-Agent": config.userAgent,
          Authorization: authResult.value,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal error";
      return jsonResponse(
        {
          success: false,
          error: {
            type: "NETWORK_ERROR",
            message: `Network request failed: ${message}`,
          },
        },
        corsHeaders,
      );
    }

    const rateLimit = parseRateLimitHeaders(response.headers);

    if (!response.ok) {
      const text = await response.text().catch(() => response.statusText);
      return jsonResponse(
        {
          success: false,
          error: {
            type: getApiErrorType(response.status),
            message: text || response.statusText,
            statusCode: response.status,
            rateLimit,
          },
        },
        corsHeaders,
      );
    }

    const contentType = response.headers.get("content-type") || "";
    let data: unknown;
    try {
      data = contentType.includes("application/x-www-form-urlencoded")
        ? parseFormUrlEncoded(await response.text())
        : await response.json();
    } catch (error) {
      return jsonResponse(
        {
          success: false,
          error: {
            type: "PARSE_ERROR",
            message: error instanceof Error
              ? error.message
              : "Failed to parse response",
          },
        },
        corsHeaders,
      );
    }

    return jsonResponse(
      { success: true, data, rateLimit: rateLimit as RateLimitInfo },
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
    "Access-Control-Allow-Origin": isAllowed ? origin ?? "*" : "",
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
