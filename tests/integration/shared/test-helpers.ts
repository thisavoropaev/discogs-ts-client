import "dotenv";
import { createDiscogsClient } from "@/discogs-client.ts";
import type { DiscogsClient, OAuthCredentials } from "@/types/mod.ts";

export const getTestCredentials = (): OAuthCredentials => {
  const credentials = {
    consumerKey: Deno.env.get("DISCOGS_CONSUMER_KEY") || "",
    consumerSecret: Deno.env.get("DISCOGS_CONSUMER_SECRET") || "",
    token: Deno.env.get("DISCOGS_ACCESS_TOKEN") || "",
    tokenSecret: Deno.env.get("DISCOGS_ACCESS_TOKEN_SECRET") || "",
  };

  if (
    !credentials.consumerKey ||
    !credentials.consumerSecret ||
    !credentials.token ||
    !credentials.tokenSecret
  ) {
    throw new Error("⚠️  Missing credentials");
  }

  return credentials;
};

export const createTestClient = (): DiscogsClient => {
  const credentials = getTestCredentials();

  return createDiscogsClient({
    credentials,
    userAgent: "DiscogsClient/1.0 +https://github.com/test/discogs-deno-client",
  });
};

export const getCurrentUsername = async (
  client: DiscogsClient
): Promise<string> => {
  const result = await client.request({
    method: "GET",
    endpoint: "/oauth/identity",
  });

  if (result.isErr()) {
    throw new Error(`Failed to get identity: ${result.error.message}`);
  }

  return result.value.username;
};

export const logSuccess = (message: string): void => {
  console.log(`✅ ${message}`);
};

export const logCleanup = (message: string): void => {
  console.log(`🧹 Cleanup: ${message}`);
};
