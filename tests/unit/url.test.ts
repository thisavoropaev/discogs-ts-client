import { assertEquals, assertThrows } from "@std/assert";
import { buildPath, buildRequestUrl } from "@/url.ts";

Deno.test("buildPath - replaces path parameters", () => {
  const result = buildPath("/releases/:release_id", { release_id: "249504" });
  assertEquals(result, "/releases/249504");
});

Deno.test("buildPath - replaces multiple path parameters", () => {
  const result = buildPath("/users/:username/wants/:release_id", {
    username: "testuser",
    release_id: "249504",
  });
  assertEquals(result, "/users/testuser/wants/249504");
});

Deno.test("buildPath - returns endpoint unchanged when no params needed", () => {
  const result = buildPath("/oauth/identity", undefined);
  assertEquals(result, "/oauth/identity");
});

Deno.test("buildPath - throws error for missing path parameters", () => {
  assertThrows(
    () => buildPath("/releases/:release_id", undefined),
    Error,
    "Missing path parameters: :release_id",
  );
});

Deno.test("buildPath - throws error for partially missing path parameters", () => {
  assertThrows(
    () => buildPath("/users/:username/wants/:release_id", { username: "test" }),
    Error,
    "Missing path parameters: :release_id",
  );
});

Deno.test("buildRequestUrl - returns URL without query params", () => {
  const result = buildRequestUrl("https://api.discogs.com/releases/249504");
  assertEquals(result, "https://api.discogs.com/releases/249504");
});

Deno.test("buildRequestUrl - appends query parameters", () => {
  const result = buildRequestUrl("https://api.discogs.com/releases/249504", {
    curr_abbr: "USD",
  });
  assertEquals(result, "https://api.discogs.com/releases/249504?curr_abbr=USD");
});

Deno.test("buildRequestUrl - appends multiple query parameters", () => {
  const result = buildRequestUrl("https://api.discogs.com/database/search", {
    q: "Nirvana",
    type: "artist",
  });
  assertEquals(
    result,
    "https://api.discogs.com/database/search?q=Nirvana&type=artist",
  );
});
