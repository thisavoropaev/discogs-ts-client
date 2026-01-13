import "dotenv";
import { assertEquals, assertExists } from "@std/assert";
import { createDiscogsClient } from "@/discogs-client.ts";
import { INVALID_RELEASE_ID, TEST_RELEASE_ID } from "./shared/test-data.ts";

const getProxyUrl = (): string => {
  const url = Deno.env.get("PROXY_WORKER_URL");
  if (!url) {
    throw new Error(
      "Missing PROXY_WORKER_URL environment variable. Set it to your deployed Cloudflare Worker URL.",
    );
  }
  return url;
};

const getProxyCredentials = () => {
  const token = Deno.env.get("DISCOGS_ACCESS_TOKEN");
  const tokenSecret = Deno.env.get("DISCOGS_ACCESS_TOKEN_SECRET");

  if (!token || !tokenSecret) {
    throw new Error(
      "Missing DISCOGS_ACCESS_TOKEN or DISCOGS_ACCESS_TOKEN_SECRET",
    );
  }

  return { token, tokenSecret };
};

Deno.test("Proxy Mode Production Tests", async (t) => {
  const proxyUrl = getProxyUrl();
  const credentials = getProxyCredentials();

  console.log(`Testing against proxy: ${proxyUrl}`);

  const client = createDiscogsClient({
    mode: "proxy",
    proxy: { url: proxyUrl },
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
});
