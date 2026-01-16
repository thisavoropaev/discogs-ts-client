import "dotenv";
import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import { createDiscogsClient } from "@/discogs-client.ts";
import { getRequestTokenViaProxy } from "@/proxy-oauth.ts";
import {
  INVALID_RELEASE_ID,
  TEST_RELEASE_ID,
} from "../integration/shared/test-data.ts";
import {
  startWrangler,
  stopWrangler,
  waitForWranglerReady,
  WORKER_URL,
} from "./wrangler-helpers.ts";

const getProxyCredentials = () => {
  const token = Deno.env.get("DISCOGS_ACCESS_TOKEN");
  const tokenSecret = Deno.env.get("DISCOGS_ACCESS_TOKEN_SECRET");

  if (!token || !tokenSecret) {
    throw new Error(
      "Missing DISCOGS_ACCESS_TOKEN or DISCOGS_ACCESS_TOKEN_SECRET in .env",
    );
  }

  return { token, tokenSecret };
};

Deno.test("Proxy Mode Integration Tests", async (t) => {
  console.log("Starting wrangler dev server...");
  const wrangler = startWrangler();

  try {
    await waitForWranglerReady();
    console.log(`Wrangler ready at ${WORKER_URL}`);

    const credentials = getProxyCredentials();
    const client = createDiscogsClient({
      mode: "proxy",
      proxy: { url: WORKER_URL },
      userCredentials: credentials,
    });

    await t.step(
      "GET /releases/{release_id} - should return release through proxy",
      async () => {
        const result = await client.request({
          method: "GET",
          endpoint: "/releases/{release_id}",
          pathParams: { release_id: TEST_RELEASE_ID },
        });

        if (result.isErr()) {
          console.error("Proxy error:", result.error);
          throw new Error(`Proxy request failed: ${result.error.message}`);
        }

        const release = result.value.data;
        assertExists(release.id);
        assertExists(release.title);
        assertEquals(release.id, parseInt(TEST_RELEASE_ID));
        assertExists(result.value.rateLimit);
        console.log(
          `✅ Release via proxy: ${release.title} by ${
            release.artists?.[0]?.name
          }`,
        );
      },
    );

    await t.step(
      "GET /oauth/identity - should authenticate through proxy",
      async () => {
        const result = await client.request({
          method: "GET",
          endpoint: "/oauth/identity",
        });

        if (result.isErr()) {
          console.error("Identity error:", result.error);
          throw new Error(`Identity request failed: ${result.error.message}`);
        }

        assertExists(result.value.data.username);
        console.log(`✅ Identity via proxy: ${result.value.data.username}`);
      },
    );

    await t.step(
      "Error handling - should return 404 for invalid release",
      async () => {
        const result = await client.request({
          method: "GET",
          endpoint: "/releases/{release_id}",
          pathParams: { release_id: INVALID_RELEASE_ID },
        });

        assertEquals(result.isErr(), true);
        if (result.isErr()) {
          console.log(
            `✅ Error handling via proxy: ${result.error.type} - ${result.error.message}`,
          );
        }
      },
    );

    await t.step(
      "getRequestTokenViaProxy - should get request token via proxy protocol",
      async () => {
        const result = await getRequestTokenViaProxy(
          WORKER_URL,
          "http://localhost:3000/callback",
        );

        if (result.isErr()) {
          console.error("OAuth error:", result.error);
          throw new Error(`OAuth request failed: ${result.error.message}`);
        }

        assertExists(result.value.requestToken);
        assertExists(result.value.requestTokenSecret);
        assertStringIncludes(
          result.value.authorizeUrl,
          "discogs.com/oauth/authorize",
        );
        console.log(
          `✅ Request token via helper: ${
            result.value.requestToken.substring(0, 10)
          }...`,
        );
      },
    );
  } finally {
    console.log("Stopping wrangler...");
    await stopWrangler(wrangler);
  }
});
