import {
  createOAuthFlow,
  createProxyHandler,
} from "@thisavoropaev/discogs-ts-client";

interface Env {
  DISCOGS_CONSUMER_KEY: string;
  DISCOGS_CONSUMER_SECRET: string;
  USER_AGENT: string;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    const oauth = createOAuthFlow({
      consumerKey: env.DISCOGS_CONSUMER_KEY,
      consumerSecret: env.DISCOGS_CONSUMER_SECRET,
      userAgent: env.USER_AGENT,
    });

    // POST /request-token {callback_url}
    // → {requestToken, requestTokenSecret, authUrl}
    if (url.pathname === "/request-token" && request.method === "POST") {
      let body: { callback_url: string };
      try {
        body = (await request.json()) as { callback_url: string };
      } catch {
        return Response.json(
          { success: false, error: "Invalid JSON" },
          { status: 400 },
        );
      }
      const result = await oauth.getRequestToken(body.callback_url);

      if (result.isErr()) {
        return Response.json(
          { success: false, error: result.error },
          { status: 500 },
        );
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

    // POST /access-token {requestToken, requestTokenSecret, oauthVerifier}
    // → {accessToken, accessTokenSecret}
    if (url.pathname === "/access-token" && request.method === "POST") {
      let body: {
        requestToken: string;
        requestTokenSecret: string;
        oauthVerifier: string;
      };
      try {
        body = await request.json();
      } catch {
        return Response.json(
          { success: false, error: "Invalid JSON" },
          { status: 400 },
        );
      }
      const result = await oauth.getAccessToken(
        body.requestToken,
        body.requestTokenSecret,
        body.oauthVerifier,
      );

      if (result.isErr()) {
        return Response.json(
          { success: false, error: result.error },
          { status: 500 },
        );
      }

      return Response.json({
        success: true,
        data: {
          accessToken: result.value.oauth_token,
          accessTokenSecret: result.value.oauth_token_secret,
        },
      });
    }

    // Proxy for authenticated API calls
    if (url.pathname === "/api") {
      const proxy = createProxyHandler({
        consumerKey: env.DISCOGS_CONSUMER_KEY,
        consumerSecret: env.DISCOGS_CONSUMER_SECRET,
        userAgent: env.USER_AGENT,
      });
      return proxy(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
