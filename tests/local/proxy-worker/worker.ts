import { createProxyHandler } from "../../../src/mod.ts";

export interface Env {
  DISCOGS_CONSUMER_KEY: string;
  DISCOGS_CONSUMER_SECRET: string;
  USER_AGENT: string;
}

export default {
  fetch(request: Request, env: Env) {
    const handler = createProxyHandler({
      consumerKey: env.DISCOGS_CONSUMER_KEY,
      consumerSecret: env.DISCOGS_CONSUMER_SECRET,
      userAgent: env.USER_AGENT,
    });
    return handler(request);
  },
};
