import { assertEquals, assertExists } from "@std/assert";
import { createTestClient, logSuccess } from "./shared/test-helpers.ts";
import { TEST_ARTIST_ID, TEST_LABEL_ID } from "./shared/test-data.ts";

Deno.test("Artists and Labels Tests", async (t) => {
  const client = createTestClient();

  await t.step(
    "GET /artists/:artist_id - should return artist details",
    async () => {
      const result = await client.request({
        method: "GET",
        endpoint: "/artists/:artist_id",
        pathParams: { artist_id: TEST_ARTIST_ID },
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
      assertEquals(artist.id, parseInt(TEST_ARTIST_ID));

      logSuccess(`Artist: ${artist.name} (ID: ${artist.id})`);
    },
  );

  await t.step(
    "GET /labels/:label_id - should return label details",
    async () => {
      const result = await client.request({
        method: "GET",
        endpoint: "/labels/:label_id",
        pathParams: { label_id: TEST_LABEL_ID },
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
      assertEquals(label.id, parseInt(TEST_LABEL_ID));

      logSuccess(`Label: ${label.name} (ID: ${label.id})`);
    },
  );
});