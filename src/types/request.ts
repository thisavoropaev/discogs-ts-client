import type { EndpointResponseMap } from "./endpoint-response-map.ts";
import type { QueryParams } from "./common.ts";

export type RequestParams<
  TMethod extends keyof EndpointResponseMap,
  TEndpoint extends keyof EndpointResponseMap[TMethod],
> = {
  method: TMethod;
  endpoint: TEndpoint;
  headers?: Record<string, string>;
  pathParams?: Record<string, string>;
  queryParams?: QueryParams;
};
