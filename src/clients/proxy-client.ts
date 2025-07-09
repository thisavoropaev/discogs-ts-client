import { err, ok, type Result } from "neverthrow";
import type {
  DiscogsApiError,
  EndpointResponseMap,
  ProxyClientConfig,
  RequestParams,
} from "../types/mod.ts";

export const createProxyClient = (config: ProxyClientConfig) => {
  return {
    request: async <
      TMethod extends keyof EndpointResponseMap,
      TEndpoint extends keyof EndpointResponseMap[TMethod],
    >(
      params: RequestParams<TMethod, TEndpoint>,
    ): Promise<
      Result<EndpointResponseMap[TMethod][TEndpoint], DiscogsApiError>
    > => {
      const requestBody = {
        method: params.method,
        endpoint: params.endpoint,
        pathParams: params.pathParams,
        queryParams: params.queryParams,
        headers: params.headers,
        credentials: {
          token: config.credentials.token,
          tokenSecret: config.credentials.tokenSecret,
        },
      };

      try {
        const response = await fetch(config.proxyUrl!, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        return handleApiResponse<EndpointResponseMap[TMethod][TEndpoint]>(
          response,
        );
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Unknown error";
        return err({
          message: `Proxy request failed: ${message}`,
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
