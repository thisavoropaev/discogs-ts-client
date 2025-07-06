import { assertEquals, assertExists } from "@std/assert";
import { createAuthorizationHeader, generateOAuthSignature } from "@/auth.ts";
import type { OAuthCredentials } from "@/types/auth.ts";

Deno.test("OAuth - createAuthorizationHeader function exists", () => {
  assertExists(createAuthorizationHeader);
  assertEquals(typeof createAuthorizationHeader, "function");
});

Deno.test("OAuth - internal sign function", async () => {
  const credentials: OAuthCredentials = {
    consumerKey: "test-key",
    consumerSecret: "test-secret",
    token: "test-token",
    tokenSecret: "test-token-secret",
  };

  const result = await generateOAuthSignature({
    credentials,
    method: "GET",
    url: "https://api.example.com/test",
  });

  assertEquals(result.isOk(), true);
  if (result.isOk()) {
    assertExists(result.value);
    assertEquals(typeof result.value, "string");
  }
});

Deno.test("OAuth - createAuthorizationHeader returns Result", async () => {
  const credentials: OAuthCredentials = {
    consumerKey: "test-key",
    consumerSecret: "test-secret",
    token: "test-token",
    tokenSecret: "test-token-secret",
  };

  const result = await createAuthorizationHeader({
    credentials,
    method: "GET",
    url: "https://api.example.com/test",
  });

  assertEquals(result.isOk(), true);
  if (result.isOk()) {
    assertExists(result.value);
    assertEquals(typeof result.value, "string");
    assertEquals(result.value.startsWith("OAuth "), true);
  }
});

Deno.test("OAuth - error handling", async () => {
  const credentials: OAuthCredentials = {
    consumerKey: "", // Invalid credentials to trigger error
    consumerSecret: "",
  };

  const result = await createAuthorizationHeader({
    credentials,
    method: "GET",
    url: "https://api.example.com/test",
  });

  // Should handle errors gracefully and return a Result.Err
  assertEquals(result.isErr(), true);
});
