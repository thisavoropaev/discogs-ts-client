import { assertEquals, assertExists } from "@std/assert";
import { createTestClient, logSuccess } from "./shared/test-helpers.ts";
import { TEST_SEARCH_QUERY, TEST_SEARCH_TYPE } from "./shared/test-data.ts";

Deno.test("Database Search Tests", async (t) => {
  const client = createTestClient();

  await t.step(
    "GET /database/search - should return search results",
    async () => {
      const result = await client.request({
        method: "GET",
        endpoint: "/database/search",
        queryParams: { q: TEST_SEARCH_QUERY, type: TEST_SEARCH_TYPE },
      });

      if (result.isErr()) {
        console.error("Search error:", result.error);
        throw new Error(`Search request failed: ${result.error.message}`);
      }

      const searchResults = result.value;
      assertExists(searchResults.pagination);
      assertExists(searchResults.results);
      assertEquals(Array.isArray(searchResults.results), true);

      logSuccess(
        `Search: Found ${searchResults.results.length} results for "${TEST_SEARCH_QUERY}"`,
      );
    },
  );
});