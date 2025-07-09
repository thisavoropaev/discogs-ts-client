import type { Result } from "neverthrow";
import type { OAuthCredentials, ProxyCredentials } from "./auth.ts";
import type {
  DiscogsApiError,
  EndpointResponseMap,
  RequestParams,
} from "./mod.ts";

// Direct mode configuration
export type DirectClientConfig = {
  credentials: OAuthCredentials;
  userAgent: string;
};

// Proxy mode configuration
export type ProxyClientConfig = {
  credentials: ProxyCredentials;
  proxyUrl: string;
};

// Union type for both modes
export type DiscogsClientConfig = DirectClientConfig | ProxyClientConfig;

export type DiscogsClientOptions = {
  timeout?: number;
  retries?: number;
};

export type DiscogsClient = {
  request: <
    TMethod extends keyof EndpointResponseMap,
    TEndpoint extends keyof EndpointResponseMap[TMethod],
  >(
    params: RequestParams<TMethod, TEndpoint>,
  ) => Promise<
    Result<EndpointResponseMap[TMethod][TEndpoint], DiscogsApiError>
  >;
};
