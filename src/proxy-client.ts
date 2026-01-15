import { err, ok, type Result } from "neverthrow";
import type {
  DiscogsApiError,
  DiscogsClient,
  DiscogsResponse,
  EndpointResponseMap,
  ProxyModeConfig,
  ProxyRequestBody,
  ProxyResponse,
  RequestParams,
} from "./types/mod.ts";

export const createProxyClient = (
  config: ProxyModeConfig,
): DiscogsClient => {
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
      const userCredentials = params.userCredentials ?? config.userCredentials;
      const body: ProxyRequestBody = {
        method: params.method,
        endpoint: params.endpoint as string,
        pathParams: params.pathParams as Record<string, string | number>,
        queryParams: params.queryParams as
          | Record<string, string | number | boolean>
          | undefined,
        userCredentials,
        oauthParams: params.oauthParams,
      };

      let response: Response;
      try {
        response = await fetch(config.proxy.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } catch (error) {
        const message = error instanceof Error
          ? error.message
          : "Unknown error";
        return err({
          message: `Network request failed: ${message}`,
          type: "NETWORK_ERROR",
        });
      }

      if (!response.ok && response.status >= 500) {
        const text = await response.text().catch(() => "");
        return err({
          message: `Proxy server error (${response.status}): ${
            text.substring(0, 200) || response.statusText
          }`,
          type: "NETWORK_ERROR",
          statusCode: response.status,
        });
      }

      let proxyResponse: ProxyResponse<
        EndpointResponseMap[TMethod][TEndpoint]
      >;
      try {
        proxyResponse = (await response.json()) as ProxyResponse<
          EndpointResponseMap[TMethod][TEndpoint]
        >;
      } catch (error) {
        const parseError = error instanceof Error
          ? error.message
          : "Unknown parse error";
        return err({
          message: `Failed to parse proxy response: ${parseError}`,
          type: "PARSE_ERROR",
        });
      }

      if (proxyResponse.success) {
        return ok({
          data: proxyResponse.data,
          rateLimit: proxyResponse.rateLimit,
        });
      }

      return err({
        message: proxyResponse.error.message,
        statusCode: proxyResponse.error.statusCode,
        type: mapErrorType(proxyResponse.error.type),
      });
    },
  };
};

function mapErrorType(type: string): DiscogsApiError["type"] {
  const validTypes: DiscogsApiError["type"][] = [
    "NETWORK_ERROR",
    "AUTH_ERROR",
    "API_ERROR",
    "VALIDATION_ERROR",
    "PARSE_ERROR",
    "RATE_LIMIT_ERROR",
  ];
  if (validTypes.includes(type as DiscogsApiError["type"])) {
    return type as DiscogsApiError["type"];
  }
  console.warn(
    `Unknown error type from proxy: "${type}", mapping to API_ERROR`,
  );
  return "API_ERROR";
}
