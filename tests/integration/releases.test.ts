import { assertEquals, assertExists } from "@std/assert";
import { createTestClient, logSuccess } from "./shared/test-helpers.ts";
import {
  INVALID_RELEASE_ID,
  TEST_CURRENCY,
  TEST_MASTER_ID,
  TEST_RELEASE_ID,
} from "./shared/test-data.ts";

Deno.test("Releases and Masters Tests", async (t) => {
  const client = createTestClient();

  await t.step(
    "GET /releases/:release_id - should return release details",
    async () => {
      const result = await client.request({
        method: "GET",
        endpoint: "/releases/:release_id",
        pathParams: { release_id: TEST_RELEASE_ID },
      });

      if (result.isErr()) {
        console.error("Release error:", result.error);
        throw new Error(`Release request failed: ${result.error.message}`);
      }

      const release = result.value;
      assertExists(release.id);
      assertExists(release.title);
      assertExists(release.artists);
      assertEquals(typeof release.id, "number");
      assertEquals(typeof release.title, "string");
      assertEquals(Array.isArray(release.artists), true);
      assertEquals(release.id, parseInt(TEST_RELEASE_ID));

      logSuccess(
        `Release: ${release.title} by ${release.artists[0]?.name}`,
      );
    },
  );

  await t.step(
    "Query parameters - should work with additional parameters",
    async () => {
      const result = await client.request({
        method: "GET",
        endpoint: "/releases/:release_id",
        pathParams: { release_id: TEST_RELEASE_ID },
        queryParams: { curr_abbr: TEST_CURRENCY },
      });

      if (result.isErr()) {
        console.error("Query params error:", result.error);
        throw new Error(`Query params request failed: ${result.error.message}`);
      }

      const release = result.value;
      assertExists(release.id);
      assertExists(release.title);

      logSuccess(`Query params: ${release.title}`);
    },
  );

  await t.step(
    "Error handling - should handle invalid release ID",
    async () => {
      const result = await client.request({
        method: "GET",
        endpoint: "/releases/:release_id",
        pathParams: { release_id: INVALID_RELEASE_ID },
      });

      assertEquals(result.isErr(), true);

      if (result.isErr()) {
        assertExists(result.error.message);
        assertExists(result.error.type);
        logSuccess(
          `Error handling: ${result.error.type} - ${result.error.message}`,
        );
      }
    },
  );

  await t.step(
    "GET /masters/:master_id/versions - should return master release versions",
    async () => {
      const result = await client.request({
        method: "GET",
        endpoint: "/masters/:master_id/versions",
        pathParams: { master_id: TEST_MASTER_ID },
      });

      if (result.isErr()) {
        console.error("Master versions error:", result.error);
        throw new Error(
          `Master versions request failed: ${result.error.message}`,
        );
      }

      const versions = result.value;
      assertExists(versions.pagination);
      assertExists(versions.versions);
      assertEquals(Array.isArray(versions.versions), true);

      logSuccess(
        `Master Versions: Found ${versions.versions.length} versions for master ID ${TEST_MASTER_ID}`,
      );
    },
  );
});
