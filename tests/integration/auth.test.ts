import { assertEquals, assertExists } from "@std/assert";
import { createTestClient, logSuccess } from "./shared/test-helpers.ts";
import { TEST_HEADERS } from "./shared/test-data.ts";

Deno.test("Authentication Tests", async (t) => {
  const client = createTestClient();

  await t.step(
    "GET /oauth/identity - should return user identity",
    async () => {
      const result = await client.request({
        method: "GET",
        endpoint: "/oauth/identity",
      });

      if (result.isErr()) {
        console.error("Identity error:", result.error);
        throw new Error(`Identity request failed: ${result.error.message}`);
      }

      const identity = result.value;
      assertExists(identity.id);
      assertExists(identity.username);
      assertExists(identity.resource_url);
      assertEquals(typeof identity.id, "number");
      assertEquals(typeof identity.username, "string");
      assertEquals(typeof identity.resource_url, "string");

      logSuccess(`Identity: ${identity.username} (ID: ${identity.id})`);
    },
  );

  await t.step(
    "Custom headers - should work with additional headers",
    async () => {
      const result = await client.request({
        method: "GET",
        endpoint: "/oauth/identity",
        headers: TEST_HEADERS,
      });

      if (result.isErr()) {
        console.error("Custom headers error:", result.error);
        throw new Error(
          `Custom headers request failed: ${result.error.message}`,
        );
      }

      const identity = result.value;
      assertExists(identity.id);
      assertExists(identity.username);

      logSuccess(`Custom headers: ${identity.username}`);
    },
  );
});