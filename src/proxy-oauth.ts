import { err, ok, type Result } from "neverthrow";
import type {
  DiscogsApiError,
  ProxyRequestBody,
  ProxyResponse,
} from "./types/mod.ts";
import { getAuthorizeUrl } from "./oauth-urls.ts";

export type RequestTokenResult = {
  requestToken: string;
  requestTokenSecret: string;
  authorizeUrl: string;
};

export type AccessTokenResult = {
  accessToken: string;
  accessTokenSecret: string;
};

type OAuthTokenResponse = {
  oauth_token: string;
  oauth_token_secret: string;
};

export const getRequestTokenViaProxy = async (
  proxyUrl: string,
  callbackUrl: string,
): Promise<Result<RequestTokenResult, DiscogsApiError>> => {
  const body: ProxyRequestBody = {
    method: "POST",
    endpoint: "/oauth/request_token",
    oauthParams: { oauth_callback: callbackUrl },
  };

  let response: Response;
  try {
    response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return err({
      message: `Network request failed: ${message}`,
      type: "NETWORK_ERROR",
    });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (response.status >= 500) {
      return err({
        message: `Proxy server error (${response.status}): ${
          text.substring(0, 200) || response.statusText
        }`,
        type: "NETWORK_ERROR",
        statusCode: response.status,
      });
    }
    return err({
      message: `Proxy request failed (${response.status}): ${
        text.substring(0, 200) || response.statusText
      }`,
      type: response.status === 401
        ? "AUTH_ERROR"
        : response.status === 429
        ? "RATE_LIMIT_ERROR"
        : "VALIDATION_ERROR",
      statusCode: response.status,
    });
  }

  let proxyResponse: ProxyResponse<OAuthTokenResponse>;
  try {
    proxyResponse = await response.json();
  } catch (error) {
    const parseError = error instanceof Error
      ? error.message
      : "Unknown parse error";
    return err({
      message: `Failed to parse proxy response: ${parseError}`,
      type: "PARSE_ERROR",
    });
  }

  if (!proxyResponse.success) {
    return err({
      message: proxyResponse.error.message,
      statusCode: proxyResponse.error.statusCode,
      type: proxyResponse.error.type,
    });
  }

  const { oauth_token, oauth_token_secret } = proxyResponse.data;
  if (!oauth_token || !oauth_token_secret) {
    return err({
      message: "Invalid response: missing oauth_token or oauth_token_secret",
      type: "PARSE_ERROR",
    });
  }
  return ok({
    requestToken: oauth_token,
    requestTokenSecret: oauth_token_secret,
    authorizeUrl: getAuthorizeUrl(oauth_token),
  });
};

export const getAccessTokenViaProxy = async (
  proxyUrl: string,
  requestToken: string,
  requestTokenSecret: string,
  verifier: string,
): Promise<Result<AccessTokenResult, DiscogsApiError>> => {
  const body: ProxyRequestBody = {
    method: "POST",
    endpoint: "/oauth/access_token",
    userCredentials: { token: requestToken, tokenSecret: requestTokenSecret },
    oauthParams: { oauth_verifier: verifier },
  };

  let response: Response;
  try {
    response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return err({
      message: `Network request failed: ${message}`,
      type: "NETWORK_ERROR",
    });
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    if (response.status >= 500) {
      return err({
        message: `Proxy server error (${response.status}): ${
          text.substring(0, 200) || response.statusText
        }`,
        type: "NETWORK_ERROR",
        statusCode: response.status,
      });
    }
    return err({
      message: `Proxy request failed (${response.status}): ${
        text.substring(0, 200) || response.statusText
      }`,
      type: response.status === 401
        ? "AUTH_ERROR"
        : response.status === 429
        ? "RATE_LIMIT_ERROR"
        : "VALIDATION_ERROR",
      statusCode: response.status,
    });
  }

  let proxyResponse: ProxyResponse<OAuthTokenResponse>;
  try {
    proxyResponse = await response.json();
  } catch (error) {
    const parseError = error instanceof Error
      ? error.message
      : "Unknown parse error";
    return err({
      message: `Failed to parse proxy response: ${parseError}`,
      type: "PARSE_ERROR",
    });
  }

  if (!proxyResponse.success) {
    return err({
      message: proxyResponse.error.message,
      statusCode: proxyResponse.error.statusCode,
      type: proxyResponse.error.type,
    });
  }

  const { oauth_token, oauth_token_secret } = proxyResponse.data;
  if (!oauth_token || !oauth_token_secret) {
    return err({
      message: "Invalid response: missing oauth_token or oauth_token_secret",
      type: "PARSE_ERROR",
    });
  }
  return ok({
    accessToken: oauth_token,
    accessTokenSecret: oauth_token_secret,
  });
};
