# A lightweight and modern TypeScript client for the Discogs API, built specifically for edge runtimes.

Discogs uses OAuth 1.0a, which makes it unsuitable for direct client-side requests. This library is designed to run in edge environments like Edge Functions / Cloudflare Workers, acting as a secure proxy between the client and Discogs. It's lightweight, framework-agnostic, and also works seamlessly in Node.js.

[test-badge]: https://github.com/thisavoropaev/discogs-deno-client/actions/workflows/test.yml/badge.svg
[test-url]: https://github.com/thisavoropaev/discogs-deno-client/actions/workflows/test.yml
[jsr-badge]: https://jsr.io/badges/@thisavoropaev/discogs-deno-client
[jsr-url]: https://jsr.io/@thisavoropaev/discogs-deno-client

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
import { createDiscogsClient } from "jsr:@thisavoropaev/discogs-deno-client";
```

## Usage Examples

### Cloudflare Worker

```typescript
import { createDiscogsClient } from "jsr:@thisavoropaev/discogs-deno-client";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const client = createDiscogsClient({
      credentials: {
        consumerKey: env.DISCOGS_CONSUMER_KEY,
        consumerSecret: env.DISCOGS_CONSUMER_SECRET,
        token: env.DISCOGS_ACCESS_TOKEN,
        tokenSecret: env.DISCOGS_ACCESS_TOKEN_SECRET,
      },
      userAgent: "MyApp/1.0 +https://github.com/your-username/your-app",
    });

    const url = new URL(request.url);
    const query = url.searchParams.get("q");

    if (!query) {
      return new Response("Missing query parameter", { status: 400 });
    }

    const result = await client.request({
      method: "GET",
      endpoint: "/database/search",
      queryParams: { q: query },
    });

    if (result.isErr()) {
      return new Response(`Search failed: ${result.error.message}`, {
        status: 500,
      });
    }

    return Response.json(result.value);
  },
};
```

## Using the Result Pattern

The client uses the [neverthrow](https://github.com/supermacro/neverthrow)
library for error handling:

```typescript
// Making a request with query parameters
const result = await client.request({
  method: "GET",
  endpoint: "/releases/:release_id",
  pathParams: { release_id: "249504" },
  queryParams: { curr_abbr: "USD" },
});

if (result.isErr()) {
  console.error("Error:", result.error.message);
  console.error("Error type:", result.error.type);
  return;
}

// Safely access the successful result
const release = result.value;
console.log(`${release.title} (${release.year})`);
```

## Development

### Prerequisites

- [Deno](https://deno.land/) 2.x

### Setup

```bash
# Clone the repository
git clone git@github.com:thisavoropaev/discogs-deno-client.git
cd discogs-deno-client

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

#### Configuration

```typescript
type DiscogsClientConfig = {
  credentials: {
    consumerKey: string;
    consumerSecret: string;
    token?: string;
    tokenSecret?: string;
  };
  userAgent: string; // Required: Your app identifier
};
```

#### Request Method

```typescript
client.request({
  method: "GET" | "POST" | "PUT" | "DELETE", // HTTP method
  endpoint: string, // API endpoint path with placeholders
  pathParams: Record<string, string | number>, // Path parameters
  queryParams: Record<string, string>, // Query parameters
  headers: Record<string, string>, // Additional headers
});
```

## Environment Variables

For authenticated requests, set these environment variables:

```bash
DISCOGS_CONSUMER_KEY=your-consumer-key
DISCOGS_CONSUMER_SECRET=your-consumer-secret
DISCOGS_ACCESS_TOKEN=your-access-token
DISCOGS_ACCESS_TOKEN_SECRET=your-access-token-secret
```

## License

MIT License - see LICENSE file for details.
