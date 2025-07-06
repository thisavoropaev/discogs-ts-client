import "dotenv";
import { assertEquals, assertExists } from "@std/assert";
import { createDiscogsClient } from "@/discogs-client.ts";

Deno.test("Discogs Client Integration Tests", async (t) => {
  const credentials = {
    consumerKey: Deno.env.get("DISCOGS_CONSUMER_KEY") || "",
    consumerSecret: Deno.env.get("DISCOGS_CONSUMER_SECRET") || "",
    token: Deno.env.get("DISCOGS_ACCESS_TOKEN") || "",
    tokenSecret: Deno.env.get("DISCOGS_ACCESS_TOKEN_SECRET") || "",
  };

  if (
    !credentials.consumerKey ||
    !credentials.consumerSecret ||
    !credentials.token ||
    !credentials.tokenSecret
  ) {
    throw new Error("⚠️  Missing credentials");
  }

  const client = createDiscogsClient({
    credentials,
    userAgent: "DiscogsClient/1.0 +https://github.com/test/discogs-ts-client",
  });

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

      console.log(`✅ Identity: ${identity.username} (ID: ${identity.id})`);
    }
  );

  await t.step(
    "GET /releases/:release_id - should return release details",
    async () => {
      // Using a well-known release ID (Nevermind by Nirvana)
      const releaseId = "249504";

      const result = await client.request({
        method: "GET",
        endpoint: "/releases/:release_id",
        pathParams: { release_id: releaseId },
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
      assertEquals(release.id, parseInt(releaseId));

      console.log(
        `✅ Release: ${release.title} by ${release.artists[0]?.name}`
      );
    }
  );

  await t.step(
    "GET /users/:username - should return user profile",
    async () => {
      // First get current user identity to use their username
      const identityResult = await client.request({
        method: "GET",
        endpoint: "/oauth/identity",
      });

      if (identityResult.isErr()) {
        throw new Error("Failed to get identity for user profile test");
      }

      const username = identityResult.value.username;

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

      console.log(`✅ User Profile: ${profile.username} (ID: ${profile.id})`);
    }
  );

  await t.step(
    "Error handling - should handle invalid release ID",
    async () => {
      const result = await client.request({
        method: "GET",
        endpoint: "/releases/:release_id",
        pathParams: { release_id: "invalid-id" },
      });

      // Should return an error for invalid release ID
      assertEquals(result.isErr(), true);

      if (result.isErr()) {
        assertExists(result.error.message);
        assertExists(result.error.type);
        console.log(
          `✅ Error handling: ${result.error.type} - ${result.error.message}`
        );
      }
    }
  );

  await t.step(
    "Query parameters - should work with additional parameters",
    async () => {
      const result = await client.request({
        method: "GET",
        endpoint: "/releases/:release_id",
        pathParams: { release_id: "249504" },
        queryParams: { curr_abbr: "USD" },
      });

      if (result.isErr()) {
        console.error("Query params error:", result.error);
        throw new Error(`Query params request failed: ${result.error.message}`);
      }

      const release = result.value;
      assertExists(release.id);
      assertExists(release.title);

      console.log(`✅ Query params: ${release.title}`);
    }
  );

  await t.step(
    "Custom headers - should work with additional headers",
    async () => {
      const result = await client.request({
        method: "GET",
        endpoint: "/oauth/identity",
        headers: {
          "Accept-Language": "en-US",
        },
      });

      if (result.isErr()) {
        console.error("Custom headers error:", result.error);
        throw new Error(
          `Custom headers request failed: ${result.error.message}`
        );
      }

      const identity = result.value;
      assertExists(identity.id);
      assertExists(identity.username);

      console.log(`✅ Custom headers: ${identity.username}`);
    }
  );

  await t.step(
    "GET /database/search - should return search results",
    async () => {
      const result = await client.request({
        method: "GET",
        endpoint: "/database/search",
        queryParams: { q: "Nirvana", type: "artist" },
      });

      if (result.isErr()) {
        console.error("Search error:", result.error);
        throw new Error(`Search request failed: ${result.error.message}`);
      }

      const searchResults = result.value;
      assertExists(searchResults.pagination);
      assertExists(searchResults.results);
      assertEquals(Array.isArray(searchResults.results), true);

      console.log(
        `✅ Search: Found ${searchResults.results.length} results for \"Nirvana\"`
      );
    }
  );

  await t.step(
    "PUT /users/:username/wants/:release_id - should add release to wantlist",
    async () => {
      // First get current user identity to use their username
      const identityResult = await client.request({
        method: "GET",
        endpoint: "/oauth/identity",
      });

      if (identityResult.isErr()) {
        throw new Error("Failed to get identity for wantlist test");
      }

      const username = identityResult.value.username;
      const releaseId = "249504"; // Test release ID - Nirvana Nevermind

      const result = await client.request({
        method: "PUT",
        endpoint: "/users/:username/wants/:release_id",
        pathParams: { username, release_id: releaseId },
        queryParams: { notes: "Test note", rating: "4" },
      });

      if (result.isErr()) {
        console.error("Add to wantlist error:", result.error);
        throw new Error(
          `Add to wantlist request failed: ${result.error.message}`
        );
      }

      console.log(
        `✅ Add to Wantlist: Added release ${releaseId} to ${username}'s wantlist`
      );
    }
  );

  // Clean up - remove from wantlist after test
  await t.step(
    "DELETE /users/:username/wants/:release_id - should remove release from wantlist",
    async () => {
      const identityResult = await client.request({
        method: "GET",
        endpoint: "/oauth/identity",
      });

      if (identityResult.isErr()) {
        throw new Error("Failed to get identity for cleanup");
      }

      const username = identityResult.value.username;
      const releaseId = "249504"; // Same release ID as PUT test

      const result = await client.request({
        method: "DELETE",
        endpoint: "/users/:username/wants/:release_id",
        pathParams: { username, release_id: releaseId },
      });

      if (result.isErr()) {
        console.warn("Cleanup warning:", result.error.message);
        // Don't fail the test if cleanup fails
      } else {
        console.log(
          `🧹 Cleanup: Removed release ${releaseId} from ${username}'s wantlist`
        );
      }
    }
  );

  await t.step(
    "GET /masters/:master_id/versions - should return master release versions",
    async () => {
      const masterId = "13815"; // Nirvana - Nevermind
      const result = await client.request({
        method: "GET",
        endpoint: "/masters/:master_id/versions",
        pathParams: { master_id: masterId },
      });

      if (result.isErr()) {
        console.error("Master versions error:", result.error);
        throw new Error(
          `Master versions request failed: ${result.error.message}`
        );
      }

      const versions = result.value;
      assertExists(versions.pagination);
      assertExists(versions.versions);
      assertEquals(Array.isArray(versions.versions), true);

      console.log(
        `✅ Master Versions: Found ${versions.versions.length} versions for master ID ${masterId}`
      );
    }
  );

  await t.step(
    "GET /marketplace/stats/:release_id - should handle untyped endpoints",
    async () => {
      const releaseId = "249504"; // Nirvana - Nevermind
      const result = await client.request({
        method: "GET",
        // Testing an endpoint not defined in the map to check fallback behavior
        endpoint: "/marketplace/stats/:release_id",
        pathParams: { release_id: releaseId },
      });

      if (result.isErr()) {
        console.error("Marketplace stats error:", result.error);
        throw new Error(
          `Marketplace stats request failed: ${result.error.message}`
        );
      }

      const stats = result.value;

      // The type is unknown, so we need to perform type checks
      assertExists(stats);
      assertEquals(typeof stats, "object");

      if (typeof stats === "object" && stats !== null) {
        assertExists("blocked_from_sale" in stats);
        assertEquals(
          typeof (stats as { blocked_from_sale: boolean }).blocked_from_sale,
          "boolean"
        );

        const statsObj = stats as {
          num_for_sale?: number;
          lowest_price?: { value: number; currency: string } | null;
        };

        if (statsObj.num_for_sale && statsObj.num_for_sale > 0) {
          assertExists(statsObj.lowest_price);
          if (statsObj.lowest_price) {
            assertEquals(typeof statsObj.lowest_price.value, "number");
            assertEquals(typeof statsObj.lowest_price.currency, "string");
          }
        }
      }

      console.log(
        `✅ Untyped Endpoint: Fetched marketplace stats for release ID ${releaseId}`
      );
    }
  );

  await t.step(
    "GET /artists/:artist_id - should return artist details",
    async () => {
      const artistId = "108713"; // Nirvana
      const result = await client.request({
        method: "GET",
        endpoint: "/artists/:artist_id",
        pathParams: { artist_id: artistId },
      });

      if (result.isErr()) {
        console.error("Artist error:", result.error);
        throw new Error(`Artist request failed: ${result.error.message}`);
      }

      const artist = result.value;
      assertExists(artist.id);
      assertExists(artist.name);
      assertExists(artist.resource_url);
      assertEquals(typeof artist.id, "number");
      assertEquals(typeof artist.name, "string");
      assertEquals(typeof artist.resource_url, "string");
      assertEquals(artist.id, parseInt(artistId));

      console.log(`✅ Artist: ${artist.name} (ID: ${artist.id})`);
    }
  );

  await t.step(
    "GET /labels/:label_id - should return label details",
    async () => {
      const labelId = "1"; // DGC Records
      const result = await client.request({
        method: "GET",
        endpoint: "/labels/:label_id",
        pathParams: { label_id: labelId },
      });

      if (result.isErr()) {
        console.error("Label error:", result.error);
        throw new Error(`Label request failed: ${result.error.message}`);
      }

      const label = result.value;
      assertExists(label.id);
      assertExists(label.name);
      assertExists(label.resource_url);
      assertEquals(typeof label.id, "number");
      assertEquals(typeof label.name, "string");
      assertEquals(typeof label.resource_url, "string");
      assertEquals(label.id, parseInt(labelId));

      console.log(`✅ Label: ${label.name} (ID: ${label.id})`);
    }
  );

  await t.step(
    "GET /users/:username/collection/folders - should return collection folders",
    async () => {
      const identityResult = await client.request({
        method: "GET",
        endpoint: "/oauth/identity",
      });

      if (identityResult.isErr()) {
        throw new Error("Failed to get identity for collection folders test");
      }

      const username = identityResult.value.username;

      const result = await client.request({
        method: "GET",
        endpoint: "/users/:username/collection/folders",
        pathParams: { username },
      });

      if (result.isErr()) {
        console.error("Collection folders error:", result.error);
        throw new Error(
          `Collection folders request failed: ${result.error.message}`
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

      console.log(
        `✅ Collection Folders: Found ${folders.folders.length} folders for user ${username}`
      );
    }
  );

  await t.step(
    "GET /marketplace/stats/:release_id - should return release statistics with currency",
    async () => {
      const releaseId = "249504"; // Nirvana - Nevermind
      const result = await client.request({
        method: "GET",
        endpoint: "/marketplace/stats/:release_id",
        pathParams: { release_id: releaseId },
        queryParams: { curr_abbr: "USD" },
      });

      if (result.isErr()) {
        console.error("Release statistics error:", result.error);
        throw new Error(
          `Release statistics request failed: ${result.error.message}`
        );
      }

      const stats = result.value;
      assertExists(stats);
      assertEquals(typeof stats, "object");

      if (typeof stats === "object" && stats !== null) {
        const statsObj = stats as {
          blocked_from_sale?: boolean;
          num_for_sale?: number;
          lowest_price?: { value: number; currency: string } | null;
        };

        if ("blocked_from_sale" in statsObj) {
          assertEquals(typeof statsObj.blocked_from_sale, "boolean");
        }

        if (
          "num_for_sale" in statsObj &&
          typeof statsObj.num_for_sale === "number"
        ) {
          assertEquals(typeof statsObj.num_for_sale, "number");
        }

        if ("lowest_price" in statsObj && statsObj.lowest_price) {
          assertExists(statsObj.lowest_price.value);
          assertExists(statsObj.lowest_price.currency);
          assertEquals(typeof statsObj.lowest_price.value, "number");
          assertEquals(typeof statsObj.lowest_price.currency, "string");
          assertEquals(statsObj.lowest_price.currency, "USD");
        }
      }

      console.log(
        `✅ Release Statistics: Fetched marketplace stats for release ID ${releaseId} with USD currency`
      );
    }
  );
});
