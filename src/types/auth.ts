import type { HttpMethod, QueryParams } from "./common.ts";

export type OAuthCredentials = {
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
};

export type ProxyCredentials = {
  token?: string;
  tokenSecret?: string;
};

export type OAuthSignatureParams = {
  credentials: OAuthCredentials;
  method: HttpMethod;
  url: string;
  parameters?: QueryParams;
};

export type InternalOAuthErrorCode =
  | "SIGNATURE_GENERATION_FAILED"
  | "NETWORK_ERROR"
  | "INVALID_CREDENTIALS";

export type OAuthSignResult = {
  oauth_signature: string;
  oauth_consumer_key: string;
  oauth_nonce?: string;
  oauth_signature_method?: string;
  oauth_timestamp?: number;
  oauth_version?: "1.0";
  oauth_token?: string;
};

export type OAuthError = {
  code: InternalOAuthErrorCode;
  message: string;
  details?: unknown;
};
