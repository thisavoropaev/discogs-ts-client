import "dotenv";
import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";
import {
  startWrangler,
  stopWrangler,
  waitForWranglerReady,
  WORKER_URL,
} from "./wrangler-helpers.ts";

Deno.test("OAuth Flow Integration Tests", async (t) => {
  console.log("Starting wrangler dev server...");
  const wrangler = startWrangler();

  try {
    await waitForWranglerReady();
    console.log(`Wrangler ready at ${WORKER_URL}`);

    await t.step(
      "POST /request-token - should return request token and auth URL",
      async () => {
        const response = await fetch(`${WORKER_URL}/request-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_url: "http://localhost:3000/callback",
          }),
        });

        assertEquals(response.ok, true);

        const json = (await response.json()) as {
          success: boolean;
          data?: {
            requestToken: string;
            requestTokenSecret: string;
            authUrl: string;
          };
        };

        assertEquals(json.success, true);
        assertExists(json.data);
        assertExists(json.data.requestToken);
        assertExists(json.data.requestTokenSecret);
        assertExists(json.data.authUrl);
        assertStringIncludes(json.data.authUrl, "oauth_token=");
        assertStringIncludes(json.data.authUrl, "discogs.com/oauth/authorize");

        console.log(
          `✅ Request token: ${json.data.requestToken.substring(0, 10)}...`,
        );
        console.log(`✅ Auth URL: ${json.data.authUrl}`);
      },
    );
  } finally {
    console.log("Stopping wrangler...");
    await stopWrangler(wrangler);
  }
});
