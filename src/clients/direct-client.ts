import { err, ok, type Result } from "neverthrow";
import { buildPath, buildRequestUrl } from "../url.ts";
import { createAuthorizationHeader } from "../auth.ts";
import type {
  DirectClientConfig,
  DiscogsApiError,
  EndpointResponseMap,
  RequestParams,
} from "../types/mod.ts";

const DISCOGS_API_URL = "https://api.discogs.com";

export const createDirectClient = (config: DirectClientConfig) => {
  return {
    request: async <
      TMethod extends keyof EndpointResponseMap,
      TEndpoint extends keyof EndpointResponseMap[TMethod],
    >(
      params: RequestParams<TMethod, TEndpoint>,
    ): Promise<
      Result<EndpointResponseMap[TMethod][TEndpoint], DiscogsApiError>
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
        "User-Agent": config.userAgent!,
        Authorization: authHeaderResult.value,
        ...params.headers,
      };

      try {
        const response = await fetch(requestUrl, {
          method: params.method,
          headers,
        });

        return handleApiResponse<EndpointResponseMap[TMethod][TEndpoint]>(
          response,
        );
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
): Promise<Result<T, DiscogsApiError>> {
  try {
    const text = await response.text();

    if (!response.ok) {
      return err({
        message: text || response.statusText,
        statusCode: response.status,
        type: getApiErrorType(response.status),
      });
    }

    const data = JSON.parse(text) as T;
    return ok(data);
  } catch (error) {
    return err({
      message: error instanceof Error ? error.message : "Unknown error",
      type: "NETWORK_ERROR",
    });
  }
}

function getApiErrorType(status: number): DiscogsApiError["type"] {
  if (status === 401) return "AUTH_ERROR";
  if (status >= 400 && status < 500) return "VALIDATION_ERROR";
  return "API_ERROR";
}
