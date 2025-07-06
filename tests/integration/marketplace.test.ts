import { assertEquals, assertExists } from "@std/assert";
import { createTestClient, logSuccess } from "./shared/test-helpers.ts";
import { TEST_CURRENCY, TEST_RELEASE_ID } from "./shared/test-data.ts";

Deno.test("Marketplace Tests", async (t) => {
  const client = createTestClient();

  await t.step(
    "GET /marketplace/stats/:release_id - should handle untyped endpoints",
    async () => {
      const result = await client.request({
        method: "GET",
        endpoint: "/marketplace/stats/:release_id",
        pathParams: { release_id: TEST_RELEASE_ID },
      });

      if (result.isErr()) {
        console.error("Marketplace stats error:", result.error);
        throw new Error(
          `Marketplace stats request failed: ${result.error.message}`,
        );
      }

      const stats = result.value;
      assertExists(stats);
      assertEquals(typeof stats, "object");

      if (typeof stats === "object" && stats !== null) {
        assertExists("blocked_from_sale" in stats);
        assertEquals(
          typeof (stats as { blocked_from_sale: boolean }).blocked_from_sale,
          "boolean",
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

      logSuccess(
        `Untyped Endpoint: Fetched marketplace stats for release ID ${TEST_RELEASE_ID}`,
      );
    },
  );

  await t.step(
    "GET /marketplace/stats/:release_id - should return release statistics with currency",
    async () => {
      const result = await client.request({
        method: "GET",
        endpoint: "/marketplace/stats/:release_id",
        pathParams: { release_id: TEST_RELEASE_ID },
        queryParams: { curr_abbr: TEST_CURRENCY },
      });

      if (result.isErr()) {
        console.error("Release statistics error:", result.error);
        throw new Error(
          `Release statistics request failed: ${result.error.message}`,
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
          assertEquals(statsObj.lowest_price.currency, TEST_CURRENCY);
        }
      }

      logSuccess(
        `Release Statistics: Fetched marketplace stats for release ID ${TEST_RELEASE_ID} with ${TEST_CURRENCY} currency`,
      );
    },
  );
});
