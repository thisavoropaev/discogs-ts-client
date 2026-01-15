import { createOAuthFlow, createProxyHandler } from "../../../src/mod.ts";

export interface Env {
  DISCOGS_CONSUMER_KEY: string;
  DISCOGS_CONSUMER_SECRET: string;
  USER_AGENT: string;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // OAuth: POST /request-token
    if (url.pathname === "/request-token" && request.method === "POST") {
      const oauth = createOAuthFlow({
        consumerKey: env.DISCOGS_CONSUMER_KEY,
        consumerSecret: env.DISCOGS_CONSUMER_SECRET,
        userAgent: env.USER_AGENT,
      });
      const body = (await request.json()) as { callback_url: string };
      const result = await oauth.getRequestToken(body.callback_url);

      if (result.isErr()) {
        return Response.json({ success: false, error: result.error }, {
          status: 500,
        });
      }
      return Response.json({
        success: true,
        data: {
          requestToken: result.value.oauth_token,
          requestTokenSecret: result.value.oauth_token_secret,
          authUrl: oauth.getAuthorizeUrl(result.value.oauth_token),
        },
      });
    }

    // OAuth: POST /access-token
    if (url.pathname === "/access-token" && request.method === "POST") {
      const oauth = createOAuthFlow({
        consumerKey: env.DISCOGS_CONSUMER_KEY,
        consumerSecret: env.DISCOGS_CONSUMER_SECRET,
        userAgent: env.USER_AGENT,
      });
      const body = (await request.json()) as {
        requestToken: string;
        requestTokenSecret: string;
        oauthVerifier: string;
      };
      const result = await oauth.getAccessToken(
        body.requestToken,
        body.requestTokenSecret,
        body.oauthVerifier,
      );

      if (result.isErr()) {
        return Response.json({ success: false, error: result.error }, {
          status: 500,
        });
      }
      return Response.json({
        success: true,
        data: {
          accessToken: result.value.oauth_token,
          accessTokenSecret: result.value.oauth_token_secret,
        },
      });
    }

    // Proxy: POST / (default)
    const handler = createProxyHandler({
      consumerKey: env.DISCOGS_CONSUMER_KEY,
      consumerSecret: env.DISCOGS_CONSUMER_SECRET,
      userAgent: env.USER_AGENT,
    });
    return handler(request);
  },
};
