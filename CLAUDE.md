# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

TypeScript client library for the Discogs API, published as
`@thisavoropaev/discogs-ts-client` on JSR. Designed for edge runtimes (Vercel
Edge, Cloudflare Workers, Deno Deploy) with zero external runtime dependencies.

## Development Environment

- **Runtime:** Deno 2.x
- **Module System:** ESM only
- **TypeScript:** Strict mode

## Commands

```bash
deno task test              # Run all tests (unit + integration)
deno task test:unit         # Unit tests only
deno task test:integration  # Integration tests (requires .env)
deno task check             # Type check
deno task lint              # Lint
deno fmt                    # Format

# Run single test file
deno test tests/unit/auth.test.ts --allow-net --allow-env

# Integration test suites
deno task test:integration:releases
deno task test:integration:users
deno task test:integration:database
deno task test:integration:marketplace
deno task test:integration:artists-labels
deno task test:integration:auth

# Local proxy testing (requires wrangler)
deno task test:local:proxy
```

## Architecture

### Three Main Entry Points

1. `createDiscogsClient` - API client (direct or proxy mode)
2. `createProxyHandler` - Cloudflare Worker handler for proxying
3. `createOAuthFlow` - Full OAuth 1.0a authorization flow

### Client Modes

```typescript
// Direct mode - server-side
const client = createDiscogsClient({
  credentials: { consumerKey, consumerSecret, token, tokenSecret },
  userAgent: "MyApp/1.0",
});

// Proxy mode - frontend via worker
const client = createDiscogsClient({
  mode: "proxy",
  proxy: { url: "https://your-worker.workers.dev" },
  userCredentials: { token, tokenSecret }, // optional for app-only auth
});
```

### OAuth 1.0a Flow

For implementing Discogs authorization in your app:

```typescript
const oauth = createOAuthFlow({
  consumerKey: "...",
  consumerSecret: "...",
  userAgent: "MyApp/1.0",
});

// Step 1: Get request token
const result = await oauth.getRequestToken("https://your-app.com/callback");
// → { oauth_token, oauth_token_secret }

// Step 2: Redirect user to authorize
const authUrl = oauth.getAuthorizeUrl(result.value.oauth_token);

// Step 3: Exchange verifier for access token
const tokens = await oauth.getAccessToken(
  requestToken,
  requestTokenSecret,
  verifier,
);
// → { oauth_token, oauth_token_secret }
```

### Proxy Handler

Worker handler with CORS, validation, and error mapping:

```typescript
const handler = createProxyHandler({
  consumerKey: "...",
  consumerSecret: "...",
  userAgent: "MyApp/1.0",
  allowedOrigins: ["https://your-frontend.com"], // optional, defaults to ["*"]
});
```

Frontend sends POST with JSON body:

```typescript
{ method, endpoint, pathParams?, queryParams?, userCredentials?, oauthParams? }
```

### Key Source Files

- `src/mod.ts` - Public exports
- `src/discogs-client.ts` - Client factory
- `src/oauth-flow.ts` - OAuth 1.0a implementation
- `src/proxy-handler.ts` - Worker handler with CORS/validation
- `src/proxy-client.ts` - Proxy mode implementation
- `src/auth.ts` - OAuth signature generation
- `src/errors.ts` - Shared `getApiErrorType()` helper
- `src/types/endpoint-response-map.ts` - Endpoint → response type mapping

### Type System

`EndpointResponseMap` maps endpoints to response types. Return types inferred
from method + path:

```typescript
const result = await client.request({
  method: "GET",
  endpoint: "/releases/{release_id}",
  pathParams: { release_id: 249504 },
});
// → Result<DiscogsResponse<GetReleaseResponse>, DiscogsApiError>
```

### Error Handling

Uses `neverthrow` Result-based returns. Error types:

- `AUTH_ERROR` (401)
- `VALIDATION_ERROR` (400, 422)
- `API_ERROR` (5xx)
- `NETWORK_ERROR`
- `PARSE_ERROR`
- `RATE_LIMIT_ERROR` (429)

## Test Structure

```
tests/
├── unit/           # Module isolation tests
├── integration/    # Real Discogs API calls
│   └── shared/     # Test helpers & data
└── local/          # Wrangler-based proxy tests
    ├── proxy.test.ts
    ├── proxy-worker/   # Worker for local testing
    └── wrangler-helpers.ts
```

Local tests use `startWrangler()`, `waitForWranglerReady()`, `stopWrangler()`
helpers.

## Environment Variables

For integration tests, create `.env`:

```
DISCOGS_CONSUMER_KEY=your_key
DISCOGS_CONSUMER_SECRET=your_secret
DISCOGS_ACCESS_TOKEN=your_token
DISCOGS_ACCESS_TOKEN_SECRET=your_token_secret
```

## Adding New Endpoints

1. Add response types in `src/types/endpoints/`
2. Export from `src/types/endpoints/mod.ts`
3. Map endpoint in `src/types/endpoint-response-map.ts`
4. Add integration tests in `tests/integration/`

## Examples

`examples/cloudflare-worker/` - Basic proxy worker
`examples/cloudflare-worker-oauth/` - Full OAuth + proxy worker

## Git Workflow

- **NEVER push to `main`** - triggers automatic JSR releases
- Work in feature branches
- Conventional commits: `feat:` → minor, `fix:`/`perf:`/`refactor:` → patch,
  `feat!:` → major
