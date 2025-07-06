import { assertEquals, assertExists } from "@std/assert";
import {
  createTestClient,
  getCurrentUsername,
  logSuccess,
  logCleanup,
} from "./shared/test-helpers.ts";
import {
  TEST_RELEASE_ID,
  TEST_WANTLIST_NOTE,
  TEST_WANTLIST_RATING,
} from "./shared/test-data.ts";

Deno.test("Users and Collections Tests", async (t) => {
  const client = createTestClient();

  await t.step(
    "GET /users/:username - should return user profile",
    async () => {
      const username = await getCurrentUsername(client);

      const result = await client.request({
        method: "GET",
        endpoint: "/users/:username",
        pathParams: { username },
      });

      if (result.isErr()) {
        console.error("User profile error:", result.error);
        throw new Error(`User profile request failed: ${result.error.message}`);
      }

      const profile = result.value;
      assertExists(profile.id);
      assertExists(profile.username);
      assertExists(profile.resource_url);
      assertEquals(typeof profile.id, "number");
      assertEquals(typeof profile.username, "string");
      assertEquals(typeof profile.resource_url, "string");
      assertEquals(profile.username, username);

      logSuccess(`User Profile: ${profile.username} (ID: ${profile.id})`);
    },
  );

  await t.step(
    "GET /users/:username/collection/folders - should return collection folders",
    async () => {
      const username = await getCurrentUsername(client);

      const result = await client.request({
        method: "GET",
        endpoint: "/users/:username/collection/folders",
        pathParams: { username },
      });

      if (result.isErr()) {
        console.error("Collection folders error:", result.error);
        throw new Error(
          `Collection folders request failed: ${result.error.message}`,
        );
      }

      const folders = result.value;
      assertExists(folders.folders);
      assertEquals(Array.isArray(folders.folders), true);

      if (folders.folders.length > 0) {
        const folder = folders.folders[0];
        assertExists(folder.id);
        assertExists(folder.name);
        assertEquals(typeof folder.id, "number");
        assertEquals(typeof folder.name, "string");
      }

      logSuccess(
        `Collection Folders: Found ${folders.folders.length} folders for user ${username}`,
      );
    },
  );

  await t.step(
    "PUT /users/:username/wants/:release_id - should add release to wantlist",
    async () => {
      const username = await getCurrentUsername(client);

      const result = await client.request({
        method: "PUT",
        endpoint: "/users/:username/wants/:release_id",
        pathParams: { username, release_id: TEST_RELEASE_ID },
        queryParams: { notes: TEST_WANTLIST_NOTE, rating: TEST_WANTLIST_RATING },
      });

      if (result.isErr()) {
        console.error("Add to wantlist error:", result.error);
        throw new Error(
          `Add to wantlist request failed: ${result.error.message}`,
        );
      }

      logSuccess(
        `Add to Wantlist: Added release ${TEST_RELEASE_ID} to ${username}'s wantlist`,
      );
    },
  );

  await t.step(
    "DELETE /users/:username/wants/:release_id - should remove release from wantlist",
    async () => {
      const username = await getCurrentUsername(client);

      const result = await client.request({
        method: "DELETE",
        endpoint: "/users/:username/wants/:release_id",
        pathParams: { username, release_id: TEST_RELEASE_ID },
      });

      if (result.isErr()) {
        console.warn("Cleanup warning:", result.error.message);
      } else {
        logCleanup(
          `Removed release ${TEST_RELEASE_ID} from ${username}'s wantlist`,
        );
      }
    },
  );
});