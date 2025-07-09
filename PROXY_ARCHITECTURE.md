# Proxy Architecture

This document describes the new proxy architecture that allows client-side usage
of the Discogs API through a secure server-side proxy.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client App    │───▶│  Proxy Server   │───▶│  Discogs API    │
│  (Browser/App)  │    │ (Edge Function) │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
     User tokens         App credentials        OAuth signed
     only               + OAuth signing         requests
```

## Project Structure

```
src/
├── clients/
│   ├── direct-client.ts     # Direct API requests (server-side)
│   ├── proxy-client.ts      # Proxy requests (client-side)
│   └── mod.ts              # Client exports
├── handlers/
│   ├── proxy-handler.ts     # Server-side proxy logic
│   └── mod.ts              # Handler exports
├── discogs-client.ts        # Main factory function
└── mod.ts                  # Main exports
```

## Usage Modes

### 1. Direct Mode (Server-side)

```typescript
import { createDiscogsClient } from "discogs-ts-client";

const client = createDiscogsClient({
  credentials: {
    consumerKey: "app-key",
    consumerSecret: "app-secret",
    token: "user-token",
    tokenSecret: "user-token-secret",
  },
  userAgent: "YourApp/1.0",
  // No proxyUrl = direct mode
});
```

### 2. Proxy Mode (Client-side)

```typescript
import { createDiscogsClient } from "discogs-ts-client";

const client = createDiscogsClient({
  proxyUrl: "https://your-proxy.example.com/discogs",
  credentials: {
    // Only user credentials on client
    token: "user-token",
    tokenSecret: "user-token-secret",
  },
  // userAgent handled by proxy
});
```

### 3. Proxy Server (Cloudflare Worker)

```typescript
import { createProxyHandler } from "discogs-ts-client";

const handler = createProxyHandler({
  consumerKey: "app-key",
  consumerSecret: "app-secret",
  userAgent: "YourApp/1.0",
});

export default {
  async fetch(request: Request) {
    return await handler(request);
  },
};
```

## Security Benefits

1. **App Credentials Protection**: `consumerKey` and `consumerSecret` never
   leave the server
2. **User Token Isolation**: Each user only has access to their own tokens
3. **Centralized Control**: Single proxy can serve multiple client applications
4. **Edge Optimization**: Deploy proxy on edge networks for better performance

## API Compatibility

The client API remains exactly the same regardless of mode:

```typescript
const result = await client.request({
  method: "GET",
  endpoint: "/releases/:release_id",
  pathParams: { release_id: "249504" },
});

if (result.isOk()) {
  console.log(result.value.title);
} else {
  console.error(result.error.message);
}
```

## Implementation Details

- **Automatic Mode Detection**: Presence of `proxyUrl` determines the mode
- **Type Safety**: Full TypeScript support in both modes
- **Error Handling**: Consistent error types across modes
- **CORS Support**: Built-in CORS headers in proxy handler
- **Zero Dependencies**: No additional runtime dependencies
