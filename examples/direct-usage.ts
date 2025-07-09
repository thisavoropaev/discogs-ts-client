// Example: Using the library in direct mode (server-side)
import { createDiscogsClient } from "../src/mod.ts";

// Direct usage (existing behavior)
const directClient = createDiscogsClient({
  credentials: {
    consumerKey: "your-app-consumer-key",
    consumerSecret: "your-app-consumer-secret",
    token: "user-oauth-token",
    tokenSecret: "user-oauth-token-secret",
  },
  userAgent: "YourApp/1.0 +https://yourapp.com",
  // No proxyUrl = direct mode
});

// Make requests as usual
const result = await directClient.request({
  method: "GET",
  endpoint: "/releases/:release_id",
  pathParams: { release_id: "249504" },
});

if (result.isOk()) {
  console.log("Release:", result.value.title);
} else {
  console.error("Error:", result.error.message);
}
