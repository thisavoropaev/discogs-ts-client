import type { Result } from "neverthrow";
import type { OAuthCredentials } from "./auth.ts";
import type {
  DiscogsApiError,
  EndpointResponseMap,
  RequestParams,
} from "./mod.ts";

export type DiscogsClientConfig = {
  credentials: OAuthCredentials;
  userAgent: string;
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
