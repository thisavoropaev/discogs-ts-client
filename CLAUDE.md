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

# Run a single test file
deno test tests/unit/auth.test.ts --allow-net --allow-env

# Run specific integration test suites
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

### Two Client Modes

The client factory (`createDiscogsClient`) supports two modes via discriminated
union config:

1. **Direct mode** (default): Server-side usage with full OAuth credentials
2. **Proxy mode**: Frontend usage via a Cloudflare Worker that holds app secrets

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
  userCredentials: { token, tokenSecret },
});
```

### Proxy Architecture

For frontend apps, deploy `createProxyHandler` as a Cloudflare Worker:

- Worker holds `consumerKey`/`consumerSecret` (app secrets)
- Frontend sends user's `token`/`tokenSecret` per request
- Worker creates fresh client per request with combined credentials

### Key Source Files

- `src/mod.ts` - Public exports
- `src/discogs-client.ts` - Client factory (routes to direct or proxy client)
- `src/proxy-client.ts` - Proxy mode implementation
- `src/proxy-handler.ts` - Cloudflare Worker handler
- `src/auth.ts` - OAuth 1.0a signature generation
- `src/types/endpoint-response-map.ts` - Endpoint → response type mapping

### Type System

Endpoints are mapped to response types via `EndpointResponseMap`. The generic
`request` method infers return types based on HTTP method + endpoint path:

```typescript
// Return type is automatically GetReleaseResponse
const result = await client.request({
  method: "GET",
  endpoint: "/releases/{release_id}",
  pathParams: { release_id: 249504 },
});
```

### Error Handling

Uses `neverthrow` for Result-based error handling. All async operations return
`Result<T, DiscogsApiError>`. Error types: `AUTH_ERROR`, `VALIDATION_ERROR`,
`API_ERROR`, `NETWORK_ERROR`, `PARSE_ERROR`.

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
2. Map endpoint to response type in `src/types/endpoint-response-map.ts`
3. Add integration tests in `tests/integration/`

## Git Workflow

- **NEVER push to `main` automatically.** Pushes to `main` trigger automatic
  releases to JSR.
- Work in feature branches or `development` branch.
- Use conventional commits: `feat:` → minor, `fix:`/`perf:`/`refactor:` → patch,
  `BREAKING CHANGE:` or `feat!:` → major
