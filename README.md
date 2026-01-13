# A lightweight TypeScript client for the Discogs API, built specifically for edge runtimes.

Discogs uses OAuth 1.0a, which makes it unsuitable for direct client-side
requests. This library is designed to run in edge environments like Edge
Functions / Cloudflare Workers, acting as a secure proxy between the client and
Discogs. It's lightweight, framework-agnostic, and also works seamlessly in
Node.js.

[test-badge]: https://github.com/thisavoropaev/discogs-ts-client/actions/workflows/test.yml/badge.svg
[test-url]: https://github.com/thisavoropaev/discogs-ts-client/actions/workflows/test.yml
[jsr-badge]: https://jsr.io/badges/@thisavoropaev/discogs-ts-client
[jsr-url]: https://jsr.io/@thisavoropaev/discogs-ts-client

[![JSR][jsr-badge]][jsr-url] [![CI][test-badge]][test-url]

## Features

- 🚀 **Edge Runtime Optimized**: Built specifically for serverless edge
  environments
- 🦕 **Deno Native**: Developed and built with Deno for maximum compatibility
- 📦 **Zero Dependencies**: Lightweight bundle with no external runtime
  dependencies
- 🔒 **Type Safe**: Full TypeScript support with generated declarations
- 🌐 **Web Standards**: Uses modern Web APIs (fetch, URL, etc.)
- ⚡ **Fast**: Optimized bundle size for quick cold starts
- 🔄 **Result-based Error Handling**: Uses the `Result` pattern for elegant
  error handling
- ✅ **Full Endpoint Coverage**: The client covers all Discogs API endpoints for
  comprehensive access

## Supported Platforms

- ✅ Vercel Edge Functions
- ✅ Cloudflare Workers
- ✅ Deno Deploy
- ✅ Deno Runtime
- ✅ Node.js 18+ (ESM only)

## Installation

### For Deno/Node

```typescript
import { createDiscogsClient } from "jsr:@thisavoropaev/discogs-ts-client";
```

## Client Modes

The library supports two modes:

### Direct Mode (Server-side)

Use when you have full OAuth credentials on the server:

```typescript
import { createDiscogsClient } from "jsr:@thisavoropaev/discogs-ts-client";

const client = createDiscogsClient({
  credentials: {
    consumerKey: "your-consumer-key",
    consumerSecret: "your-consumer-secret",
    token: "user-access-token",
    tokenSecret: "user-access-token-secret",
  },
  userAgent: "MyApp/1.0 +https://example.com",
});
```

### Proxy Mode (Frontend)

For frontend apps, deploy a Cloudflare Worker proxy that holds app secrets. The
frontend only sends user credentials per request.

**Frontend client:**

```typescript
const client = createDiscogsClient({
  mode: "proxy",
  proxy: { url: "https://your-worker.workers.dev" },
  userCredentials: {
    token: "user-oauth-token",
    tokenSecret: "user-oauth-token-secret",
  },
});
```

**Worker setup:** See the complete example in
[`examples/cloudflare-worker/`](./examples/cloudflare-worker/).

## Response Structure

All successful responses are wrapped in `DiscogsResponse<T>`:

```typescript
interface DiscogsResponse<T> {
  data: T; // The actual API response data
  rateLimit: {
    // Discogs rate limit info from headers
    limit: number; // Max requests per minute
    used: number; // Requests used in current window
    remaining: number;
  };
}
```

## Using the Result Pattern

The client uses the [neverthrow](https://github.com/supermacro/neverthrow)
library for error handling:

```typescript
const result = await client.request({
  method: "GET",
  endpoint: "/releases/{release_id}",
  pathParams: { release_id: 249504 },
  queryParams: { curr_abbr: "USD" },
});

if (result.isErr()) {
  console.error("Error:", result.error.message);
  console.error("Error type:", result.error.type);
  return;
}

// Access the response data and rate limit info
const { data: release, rateLimit } = result.value;
console.log(`${release.title} (${release.year})`);
console.log(`Rate limit: ${rateLimit.remaining}/${rateLimit.limit}`);
```

### Error Types

The client returns structured errors with the following types:

- `AUTH_ERROR` - Authentication failed (401)
- `VALIDATION_ERROR` - Invalid request parameters (400, 422)
- `API_ERROR` - Server-side errors (5xx) or other client errors
- `NETWORK_ERROR` - Network connectivity issues
- `PARSE_ERROR` - Failed to parse API response as JSON
- `RATE_LIMIT_ERROR` - Rate limit exceeded (429)

```typescript
if (result.isErr()) {
  switch (result.error.type) {
    case "AUTH_ERROR":
      // Handle authentication issues
      break;
    case "RATE_LIMIT_ERROR":
      // Handle rate limiting - wait and retry
      break;
      // ...
  }
}
```

## Development

### Prerequisites

- [Deno](https://deno.land/) 2.x

### Setup

```bash
# Clone the repository
git clone git@github.com:thisavoropaev/discogs-ts-client.git
cd discogs-ts-client

# Run tests
deno task test

# Check types
deno task check

# Format code
deno task fmt

# Lint code
deno task lint
```

### Testing

```bash
# Run all tests
deno task test

# Run unit tests only
deno task test:unit

# Run integration tests only
deno task test:integration
```

## Integration Testing Setup

### Local Development

For integration tests, you need to provide Discogs API credentials:

1. Create a Discogs account and register a new application at
   https://www.discogs.com/settings/developers
2. Create a `.env` file in the project root with the following content:

```bash
DISCOGS_CONSUMER_KEY=your_consumer_key
DISCOGS_CONSUMER_SECRET=your_consumer_secret
DISCOGS_ACCESS_TOKEN=your_access_token
DISCOGS_ACCESS_TOKEN_SECRET=your_access_token_secret
```

### CI/CD Setup

For GitHub Actions, add the following secrets to your repository:

- `DISCOGS_CONSUMER_KEY`
- `DISCOGS_CONSUMER_SECRET`
- `DISCOGS_ACCESS_TOKEN`
- `DISCOGS_ACCESS_TOKEN_SECRET`

Make sure to add these secrets to your "development" environment in the
repository settings.

## API Reference

### createDiscogsClient

```typescript
const client = createDiscogsClient(config: DiscogsClientConfig);
```

#### Configuration (Direct Mode)

```typescript
type DirectModeConfig = {
  mode?: "direct";
  credentials: {
    consumerKey: string;
    consumerSecret: string;
    token?: string;
    tokenSecret?: string;
  };
  userAgent: string;
};
```

#### Configuration (Proxy Mode)

```typescript
type ProxyModeConfig = {
  mode: "proxy";
  proxy: { url: string };
  userCredentials: {
    token: string;
    tokenSecret: string;
  };
};
```

#### Request Method

```typescript
client.request({
  method: "GET" | "POST" | "PUT" | "DELETE",
  endpoint: string, // API endpoint with {param} placeholders
  pathParams?: Record<string, string | number>,
  queryParams?: Record<string, string>,
  headers?: Record<string, string>,
});
```

Path parameters use curly brace syntax: `/releases/{release_id}`.

## License

MIT License - see LICENSE file for details.
