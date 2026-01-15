export const WORKER_PORT = 8787;
export const WORKER_URL = `http://localhost:${WORKER_PORT}`;
export const WORKER_CWD = "./tests/local/proxy-worker";

export const startWrangler = (
  port = WORKER_PORT,
  cwd = WORKER_CWD,
): Deno.ChildProcess => {
  const cmd = new Deno.Command("pnpm", {
    args: ["exec", "wrangler", "dev", "--port", String(port)],
    cwd,
    stdout: "piped",
    stderr: "piped",
  });
  return cmd.spawn();
};

export const waitForWranglerReady = async (
  url = WORKER_URL,
  timeout = 30000,
): Promise<void> => {
  const start = Date.now();
  let attempts = 0;
  let lastError: string | undefined;

  while (Date.now() - start < timeout) {
    try {
      const resp = await fetch(url);
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

export const stopWrangler = async (
  wrangler: Deno.ChildProcess,
): Promise<void> => {
  try {
    wrangler.kill("SIGTERM");
  } catch {
    // Process may have already terminated
  }
  await wrangler.stdout.cancel();
  await wrangler.stderr.cancel();
  await wrangler.status;
};
