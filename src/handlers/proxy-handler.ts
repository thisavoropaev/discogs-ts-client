import { err, ok, type Result } from "neverthrow";
import { buildPath, buildRequestUrl } from "../url.ts";
import { createAuthorizationHeader } from "../auth.ts";
import type {
  DiscogsApiError,
  HttpMethod,
  OAuthCredentials,
  QueryParams,
} from "../types/mod.ts";

const DISCOGS_API_URL = "https://api.discogs.com";

type ProxyRequestBody = {
  method: HttpMethod;
  endpoint: string;
  pathParams?: Record<string, string>;
  queryParams?: QueryParams;
  headers?: Record<string, string>;
  credentials: {
    token?: string;
    tokenSecret?: string;
  };
};

type ProxyHandlerConfig = {
  consumerKey: string;
  consumerSecret: string;
  userAgent: string;
};

export const createProxyHandler = (config: ProxyHandlerConfig) => {
  return async (request: Request): Promise<Response> => {
    try {
      const body: ProxyRequestBody = await request.json();

      const credentials: OAuthCredentials = {
        consumerKey: config.consumerKey,
        consumerSecret: config.consumerSecret,
        token: body.credentials.token,
        tokenSecret: body.credentials.tokenSecret,
      };

      const path = buildPath(body.endpoint, body.pathParams);
      const baseUrl = `${DISCOGS_API_URL}/${path.replace(/^\//, "")}`;
      const requestUrl = buildRequestUrl(baseUrl, body.queryParams);

      const authHeaderResult = await createAuthorizationHeader({
        credentials,
        method: body.method,
        url: baseUrl,
        parameters: body.queryParams,
      });

      if (authHeaderResult.isErr()) {
        return new Response(
          JSON.stringify({
            message: authHeaderResult.error.message,
            type: "AUTH_ERROR",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const headers = {
        "User-Agent": config.userAgent,
        Authorization: authHeaderResult.value,
        ...body.headers,
      };

      const response = await fetch(requestUrl, {
        method: body.method,
        headers,
      });

      // Forward the response from Discogs API
      const responseText = await response.text();

      return new Response(responseText, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          "Content-Type": response.headers.get("Content-Type") ||
            "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return new Response(
        JSON.stringify({
          message: `Proxy handler error: ${message}`,
          type: "NETWORK_ERROR",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  };
};
