// Example: Using the library in proxy mode (client-side)
import { createDiscogsClient } from "../src/mod.ts";

// Client-side usage with proxy
const proxyClient = createDiscogsClient({
  proxyUrl: "https://my-proxy.example.com/discogs",
  credentials: {
    // Only user-specific credentials on client
    token: "user-oauth-token",
    tokenSecret: "user-oauth-token-secret",
  },
  // userAgent is handled by proxy
});

// Make requests as usual
const result = await proxyClient.request({
  method: "GET",
  endpoint: "/releases/:release_id",
  pathParams: { release_id: "249504" },
});

if (result.isOk()) {
  console.log("Release:", result.value.title);
} else {
  console.error("Error:", result.error.message);
}
