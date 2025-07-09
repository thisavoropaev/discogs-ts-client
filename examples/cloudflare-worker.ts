// Example: Cloudflare Worker as proxy server
import { createProxyHandler } from "../src/mod.ts";

// Server-side proxy handler
const proxyHandler = createProxyHandler({
  consumerKey: "your-app-consumer-key",
  consumerSecret: "your-app-consumer-secret",
  userAgent: "YourApp/1.0 +https://yourapp.com",
});

export default {
  async fetch(request: Request): Promise<Response> {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Handle proxy requests
    if (request.method === "POST") {
      return await proxyHandler.handleRequest(request);
    }

    return new Response("Method not allowed", { status: 405 });
  },
};
