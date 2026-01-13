import "dotenv";
import { assertEquals, assertExists } from "@std/assert";
import { createDiscogsClient } from "@/discogs-client.ts";
import {
  INVALID_RELEASE_ID,
  TEST_RELEASE_ID,
} from "../integration/shared/test-data.ts";

const PROXY_PORT = 8787;
const PROXY_URL = `http://localhost:${PROXY_PORT}`;

const startWrangler = (): Deno.ChildProcess => {
  const cmd = new Deno.Command("pnpm", {
    args: ["exec", "wrangler", "dev", "--port", String(PROXY_PORT)],
    cwd: "./examples/cloudflare-worker",
    stdout: "piped",
    stderr: "piped",
  });
  return cmd.spawn();
};

const waitForWranglerReady = async (timeout = 30000): Promise<void> => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const resp = await fetch(PROXY_URL);
      await resp.body?.cancel();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("Wrangler did not start in time");
};

const stopWrangler = async (wrangler: Deno.ChildProcess): Promise<void> => {
  try {
    wrangler.kill("SIGTERM");
  } catch {
    // Process may have already terminated
  }
  await wrangler.stdout.cancel();
  await wrangler.stderr.cancel();
  await wrangler.status;
};

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
    console.log(`Wrangler ready at ${PROXY_URL}`);

    const credentials = getProxyCredentials();
    const client = createDiscogsClient({
      mode: "proxy",
      proxy: { url: PROXY_URL },
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

        const release = result.value;
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

        assertExists(result.value.username);
        console.log(`✅ Identity via proxy: ${result.value.username}`);
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
  } finally {
    console.log("Stopping wrangler...");
    await stopWrangler(wrangler);
  }
});
