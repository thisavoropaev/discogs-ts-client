import { err, ok, type Result } from "neverthrow";
import { buildPath, buildRequestUrl } from "./url.ts";
import { createAuthorizationHeader } from "./auth.ts";
import { createProxyClient } from "./proxy-client.ts";
import { parseRateLimitHeaders } from "./rate-limit.ts";
import { getApiErrorType } from "./errors.ts";
import { parseFormUrlEncoded } from "./parse-form-urlencoded.ts";
import type {
  DiscogsApiError,
  DiscogsClient,
  DiscogsClientConfig,
  DiscogsResponse,
  EndpointResponseMap,
  RequestParams,
} from "./types/mod.ts";

const DISCOGS_API_URL = "https://api.discogs.com";

export const createDiscogsClient = (
  config: DiscogsClientConfig,
): DiscogsClient => {
  if (config.mode === "proxy") {
    return createProxyClient(config);
  }

  if (!config.credentials?.consumerKey || !config.credentials?.consumerSecret) {
    throw new Error("Consumer key and secret are required");
  }

  if (!config.userAgent) {
    throw new Error("User agent is required");
  }

  return {
    request: async <
      TMethod extends keyof EndpointResponseMap,
      TEndpoint extends keyof EndpointResponseMap[TMethod],
    >(
      params: RequestParams<TMethod, TEndpoint>,
    ): Promise<
      Result<
        DiscogsResponse<EndpointResponseMap[TMethod][TEndpoint]>,
        DiscogsApiError
      >
    > => {
      const path = buildPath(params.endpoint as string, params.pathParams);
      const baseUrl = `${DISCOGS_API_URL}/${path.replace(/^\//, "")}`;
      const requestUrl = buildRequestUrl(baseUrl, params.queryParams);

      const authHeaderResult = await createAuthorizationHeader({
        credentials: config.credentials,
        method: params.method,
        url: baseUrl,
        parameters: params.queryParams,
      });

      if (authHeaderResult.isErr()) {
        return err({
          message: authHeaderResult.error.message,
          type: "AUTH_ERROR",
        });
      }

      const headers = {
        "User-Agent": config.userAgent,
        Authorization: authHeaderResult.value,
        ...params.headers,
      };

      try {
        const response = await fetch(requestUrl, {
          method: params.method,
          headers,
        });

        return handleApiResponse<
          EndpointResponseMap[TMethod][TEndpoint]
        >(response);
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Unknown error";
        return err({
          message: `Network request failed: ${message}`,
          type: "NETWORK_ERROR",
        });
      }
    },
  };
};

async function handleApiResponse<T>(
  response: Response,
): Promise<Result<DiscogsResponse<T>, DiscogsApiError>> {
  const rateLimit = parseRateLimitHeaders(response.headers);

  if (!response.ok) {
    const text = await response.text().catch(() => response.statusText);
    return err({
      message: text || response.statusText,
      statusCode: response.status,
      type: getApiErrorType(response.status),
      rateLimit,
    });
  }

  try {
    const contentType = response.headers.get("content-type") || "";
    const data = (contentType.includes("application/x-www-form-urlencoded")
      ? parseFormUrlEncoded(await response.text())
      : await response.json()) as T;
    return ok({ data, rateLimit });
  } catch (error) {
    return err({
      message: error instanceof Error
        ? error.message
        : "Failed to parse response",
      type: "PARSE_ERROR",
      rateLimit,
    });
  }
}
