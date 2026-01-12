# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/claude-code) when working
with code in this repository.

## Project Overview

This is a TypeScript client library for the Discogs API, published as
`@thisavoropaev/discogs-ts-client` on JSR (JavaScript Registry). It's designed
for edge runtime environments (Vercel Edge, Cloudflare Workers, Deno Deploy)
with zero external runtime dependencies.

## Development Environment

- **Runtime:** Deno 2.x (primary development environment)
- **Module System:** ESM only (no CommonJS)
- **TypeScript:** Strict mode enabled

## Common Commands

```bash
# Run all tests (unit + integration)
deno task test

# Run only unit tests
deno task test:unit

# Run only integration tests (requires .env with OAuth credentials)
deno task test:integration

# Type checking
deno task check

# Linting
deno task lint

# Formatting
deno fmt
```

## Architecture

### Source Structure

- `src/mod.ts` - Public entry point and exports
- `src/discogs-client.ts` - Main client factory and request handler
- `src/auth.ts` - OAuth 1.0a authentication logic
- `src/url.ts` - URL building utilities
- `src/types/` - TypeScript type definitions for all endpoints

### Key Patterns

**Error Handling:** Uses `neverthrow` for Result-based error handling. All async
operations return `Result<T, Error>` instead of throwing exceptions.

```typescript
const result = await client.get("/releases/{release_id}", {
  release_id: 249504,
});
if (result.isOk()) {
  console.log(result.value);
} else {
  console.error(result.error);
}
```

**Type-Safe Endpoints:** Endpoints are mapped to their response types via
`EndpointResponseMap`. The generic request method infers return types based on
HTTP method + endpoint path.

**OAuth 1.0a:** Custom implementation using `@thisavoropaev/oauth-1a` for
HMAC-SHA1 signature generation.

### Tests

- **Unit tests:** `tests/unit/` - Test individual functions in isolation
- **Integration tests:** `tests/integration/` - Test against live Discogs API
  (require OAuth credentials in `.env`)

## Environment Variables

For integration tests and authenticated requests, create a `.env` file with:

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
