import type { Result } from "neverthrow";
import type { OAuthCredentials } from "./auth.ts";
import type {
  DiscogsApiError,
  EndpointResponseMap,
  RateLimitInfo,
  RequestParams,
} from "./mod.ts";
import type { ProxyConfig, UserCredentials } from "./proxy.ts";

export type DirectModeConfig = {
  mode?: "direct";
  credentials: OAuthCredentials;
  userAgent: string;
};

export type ProxyModeConfig = {
  mode: "proxy";
  proxy: ProxyConfig;
  userCredentials?: UserCredentials;
};

export type DiscogsClientConfig = DirectModeConfig | ProxyModeConfig;

export interface DiscogsResponse<T> {
  data: T;
  rateLimit: RateLimitInfo;
}

export type DiscogsClient = {
  request: <
    TMethod extends keyof EndpointResponseMap,
    TEndpoint extends keyof EndpointResponseMap[TMethod],
  >(
    params: RequestParams<TMethod, TEndpoint>,
  ) => Promise<
    Result<
      DiscogsResponse<EndpointResponseMap[TMethod][TEndpoint]>,
      DiscogsApiError
    >
  >;
};
