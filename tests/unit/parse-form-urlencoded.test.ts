import { assertEquals, assertThrows } from "@std/assert";
import { parseFormUrlEncoded } from "@/parse-form-urlencoded.ts";

Deno.test("parseFormUrlEncoded - parses OAuth token response", () => {
  const text = "oauth_token=abc123&oauth_token_secret=xyz789";
  const result = parseFormUrlEncoded(text);

  assertEquals(result.oauth_token, "abc123");
  assertEquals(result.oauth_token_secret, "xyz789");
});

Deno.test("parseFormUrlEncoded - decodes URL-encoded characters", () => {
  const text = "key=hello%20world&other=a%26b%3Dc";
  const result = parseFormUrlEncoded(text);

  assertEquals(result.key, "hello world");
  assertEquals(result.other, "a&b=c");
});

Deno.test("parseFormUrlEncoded - handles + as space", () => {
  const text = "message=hello+world";
  const result = parseFormUrlEncoded(text);

  assertEquals(result.message, "hello world");
});

Deno.test("parseFormUrlEncoded - throws on empty string", () => {
  assertThrows(
    () => parseFormUrlEncoded(""),
    Error,
    "Empty response body",
  );
});

Deno.test("parseFormUrlEncoded - throws on whitespace-only string", () => {
  assertThrows(
    () => parseFormUrlEncoded("   "),
    Error,
    "Empty response body",
  );
});

Deno.test("parseFormUrlEncoded - throws on malformed input (no valid pairs)", () => {
  assertThrows(
    () => parseFormUrlEncoded("<html>error page</html>"),
    Error,
    "Invalid form-urlencoded",
  );
});
