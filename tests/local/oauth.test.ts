import "dotenv";
import { assertEquals, assertExists, assertStringIncludes } from "@std/assert";

const OAUTH_PORT = 8788;
const OAUTH_URL = `http://localhost:${OAUTH_PORT}`;

const startWrangler = (): Deno.ChildProcess => {
  const cmd = new Deno.Command("pnpm", {
    args: ["exec", "wrangler", "dev", "--port", String(OAUTH_PORT)],
    cwd: "./tests/local/oauth-worker",
    stdout: "piped",
    stderr: "piped",
  });
  return cmd.spawn();
};

const waitForWranglerReady = async (timeout = 30000): Promise<void> => {
  const start = Date.now();
  let attempts = 0;
  let lastError: string | undefined;

  while (Date.now() - start < timeout) {
    try {
      const resp = await fetch(OAUTH_URL);
      await resp.body?.cancel();
      return;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      attempts++;
      if (attempts % 10 === 0) {
        console.log(`Waiting for wrangler (attempt ${attempts}): ${lastError}`);
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(
    `Wrangler did not start in time after ${attempts} attempts. Last error: ${lastError}`,
  );
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

Deno.test("OAuth Worker Integration Tests", async (t) => {
  console.log("Starting oauth wrangler dev server...");
  const wrangler = startWrangler();

  try {
    await waitForWranglerReady();
    console.log(`OAuth wrangler ready at ${OAUTH_URL}`);

    await t.step(
      "POST /request-token - should return request token and auth URL",
      async () => {
        const response = await fetch(`${OAUTH_URL}/request-token`, {
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

    await t.step(
      "404 - should return not found for unknown path",
      async () => {
        const response = await fetch(`${OAUTH_URL}/unknown-path`);
        assertEquals(response.status, 404);
        await response.body?.cancel();
      },
    );
  } finally {
    console.log("Stopping oauth wrangler...");
    await stopWrangler(wrangler);
  }
});
