import * as oauth from "oauth-1a";
import { err, ok, type Result } from "neverthrow";
import type {
  OAuthError,
  OAuthSignatureParams,
  OAuthSignResult,
} from "./types/mod.ts";

import { buildRequestUrl } from "./url.ts";

const signOAuthRequest = async (
  params: OAuthSignatureParams
): Promise<Result<OAuthSignResult, OAuthError>> => {
  const { consumerKey, consumerSecret } = params.credentials;
  if (!consumerKey || !consumerSecret) {
    return err({
      code: "INVALID_CREDENTIALS",
      message:
        "Consumer Key and Consumer Secret are required for OAuth signature.",
    });
  }

  try {
    const client = new oauth.OAuthClient({
      consumer: {
        key: consumerKey,
        secret: consumerSecret,
      },
      signature: oauth.HMAC_SHA1,
    });

    const token =
      params.credentials.token && params.credentials.tokenSecret
        ? {
            key: params.credentials.token,
            secret: params.credentials.tokenSecret,
          }
        : undefined;

    const requestUrl = buildRequestUrl(params.url, params.parameters);
    const signResult = await client.sign(params.method, requestUrl, { token });

    return ok(signResult);
  } catch (error) {
    return err({
      code: "SIGNATURE_GENERATION_FAILED",
      message: "Failed to generate OAuth signature",
      details: error,
    });
  }
};

export const createAuthorizationHeader = async (
  params: OAuthSignatureParams
): Promise<Result<string, OAuthError>> => {
  const signResult = await signOAuthRequest(params);
  return signResult.map((result) => oauth.toAuthHeader(result));
};
