import { assertExists } from "@std/assert";
import { createDiscogsClient } from "@/discogs-client.ts";
import type { DiscogsClientConfig } from "@/types/client.ts";

Deno.test("DiscogsClient - initialization", () => {
  const config: DiscogsClientConfig = {
    credentials: {
      consumerKey: "test-key",
      consumerSecret: "test-secret",
      token: "test-token",
      tokenSecret: "test-token-secret",
    },
    userAgent: "TestApp/1.0",
  };

  const client = createDiscogsClient(config);

  assertExists(client);
  assertExists(client.request);
});
