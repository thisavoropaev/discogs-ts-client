import * as oauth from "oauth-1a";
import { err, ok, type Result } from "neverthrow";
import type {
  AccessTokenResponse,
  DiscogsApiError,
  OAuthFlowConfig,
  RequestTokenResponse,
} from "./types/mod.ts";

const DISCOGS_API_URL = "https://api.discogs.com";
const DISCOGS_AUTH_URL = "https://discogs.com";

type OAuthFlow = {
  getRequestToken: (
    callbackUrl: string,
  ) => Promise<Result<RequestTokenResponse, DiscogsApiError>>;
  getAuthorizeUrl: (requestToken: string) => string;
  getAccessToken: (
    requestToken: string,
    requestTokenSecret: string,
    verifier: string,
  ) => Promise<Result<AccessTokenResponse, DiscogsApiError>>;
};

export const createOAuthFlow = (config: OAuthFlowConfig): OAuthFlow => {
  const client = new oauth.OAuthClient({
    consumer: { key: config.consumerKey, secret: config.consumerSecret },
    signature: oauth.HMAC_SHA1,
  });

  const getRequestToken = async (
    callbackUrl: string,
  ): Promise<Result<RequestTokenResponse, DiscogsApiError>> => {
    const url = `${DISCOGS_API_URL}/oauth/request_token`;

    try {
      const signResult = await client.sign("POST", url, {
        params: { oauth_callback: callbackUrl },
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: oauth.toAuthHeader(signResult),
          "User-Agent": config.userAgent,
        },
      });

      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        return err({
          type: getApiErrorType(response.status),
          message: text || response.statusText,
          statusCode: response.status,
        });
      }

      const text = await response.text();
      const parsed = parseFormUrlEncoded(text);

      if (!parsed.oauth_token || !parsed.oauth_token_secret) {
        return err({
          type: "PARSE_ERROR",
          message:
            "Invalid response: missing oauth_token or oauth_token_secret",
        });
      }

      return ok({
        oauth_token: parsed.oauth_token,
        oauth_token_secret: parsed.oauth_token_secret,
        oauth_callback_confirmed: "true",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return err({ type: "NETWORK_ERROR", message });
    }
  };

  const getAuthorizeUrl = (requestToken: string): string =>
    `${DISCOGS_AUTH_URL}/oauth/authorize?oauth_token=${requestToken}`;

  const getAccessToken = async (
    requestToken: string,
    requestTokenSecret: string,
    verifier: string,
  ): Promise<Result<AccessTokenResponse, DiscogsApiError>> => {
    const url = `${DISCOGS_API_URL}/oauth/access_token`;

    try {
      const signResult = await client.sign("POST", url, {
        token: { key: requestToken, secret: requestTokenSecret },
        params: { oauth_verifier: verifier },
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: oauth.toAuthHeader(signResult),
          "User-Agent": config.userAgent,
        },
      });

      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        return err({
          type: getApiErrorType(response.status),
          message: text || response.statusText,
          statusCode: response.status,
        });
      }

      const text = await response.text();
      const parsed = parseFormUrlEncoded(text);

      if (!parsed.oauth_token || !parsed.oauth_token_secret) {
        return err({
          type: "PARSE_ERROR",
          message:
            "Invalid response: missing oauth_token or oauth_token_secret",
        });
      }

      return ok({
        oauth_token: parsed.oauth_token,
        oauth_token_secret: parsed.oauth_token_secret,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return err({ type: "NETWORK_ERROR", message });
    }
  };

  return { getRequestToken, getAuthorizeUrl, getAccessToken };
};

function parseFormUrlEncoded(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of text.split("&")) {
    const [key, value] = pair.split("=");
    if (key && value !== undefined) {
      result[decodeURIComponent(key)] = decodeURIComponent(value);
    }
  }
  return result;
}

function getApiErrorType(status: number): DiscogsApiError["type"] {
  if (status === 401) return "AUTH_ERROR";
  if (status === 429) return "RATE_LIMIT_ERROR";
  if (status >= 400 && status < 500) return "VALIDATION_ERROR";
  return "API_ERROR";
}
