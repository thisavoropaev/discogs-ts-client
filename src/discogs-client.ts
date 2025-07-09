import { createDirectClient } from "./clients/direct-client.ts";
import { createProxyClient } from "./clients/proxy-client.ts";
import type {
  DiscogsClient,
  DiscogsClientConfig,
  DiscogsClientOptions,
} from "./types/mod.ts";

export const createDiscogsClient = (
  config: DiscogsClientConfig,
  _options: DiscogsClientOptions = {},
): DiscogsClient => {
  // Check if it's proxy mode by presence of proxyUrl
  if ("proxyUrl" in config) {
    return createProxyClient(config);
  }

  // Direct mode
  return createDirectClient(config);
};
