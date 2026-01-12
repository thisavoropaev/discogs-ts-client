import { err, ok, type Result } from "neverthrow";
import type {
  DiscogsApiError,
  DiscogsClient,
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
      Result<EndpointResponseMap[TMethod][TEndpoint], DiscogsApiError>
    > => {
      const body: ProxyRequestBody = {
        method: params.method,
        endpoint: params.endpoint as string,
        pathParams: params.pathParams as Record<string, string | number>,
        queryParams: params.queryParams as
          | Record<string, string | number | boolean>
          | undefined,
        userCredentials: config.userCredentials,
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

      let proxyResponse: ProxyResponse<
        EndpointResponseMap[TMethod][TEndpoint]
      >;
      try {
        proxyResponse = (await response.json()) as ProxyResponse<
          EndpointResponseMap[TMethod][TEndpoint]
        >;
      } catch {
        return err({
          message: "Failed to parse proxy response",
          type: "PARSE_ERROR",
        });
      }

      if (proxyResponse.success) {
        return ok(proxyResponse.data);
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
  const validTypes = [
    "NETWORK_ERROR",
    "AUTH_ERROR",
    "API_ERROR",
    "VALIDATION_ERROR",
    "PARSE_ERROR",
  ];
  if (validTypes.includes(type)) {
    return type as DiscogsApiError["type"];
  }
  return "API_ERROR";
}
