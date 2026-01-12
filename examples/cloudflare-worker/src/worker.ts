import { createProxyHandler } from "@thisavoropaev/discogs-ts-client";

export interface Env {
  DISCOGS_CONSUMER_KEY: string;
  DISCOGS_CONSUMER_SECRET: string;
  USER_AGENT: string;
  ALLOWED_ORIGINS?: string;
}

export default {
  fetch(request: Request, env: Env) {
    const handler = createProxyHandler({
      consumerKey: env.DISCOGS_CONSUMER_KEY,
      consumerSecret: env.DISCOGS_CONSUMER_SECRET,
      userAgent: env.USER_AGENT,
      allowedOrigins: env.ALLOWED_ORIGINS?.split(","),
    });
    return handler(request);
  },
};
