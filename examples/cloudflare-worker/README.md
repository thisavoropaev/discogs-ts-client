# Discogs Proxy Worker

A Cloudflare Worker that proxies requests to the Discogs API with OAuth 1.0a
authentication.

## Setup

### 1. Install dependencies

```bash
npm install @thisavoropaev/discogs-ts-client
```

### 2. Configure secrets

Set your Discogs application credentials:

```bash
wrangler secret put DISCOGS_CONSUMER_KEY
wrangler secret put DISCOGS_CONSUMER_SECRET
```

### 3. Configure CORS (optional)

Edit `wrangler.toml` to restrict allowed origins:

```toml
[vars]
ALLOWED_ORIGINS = "https://myapp.com,https://staging.myapp.com"
```

Leave commented out or set to `*` for all origins.

### 4. Deploy

```bash
wrangler deploy
```

## Usage

### Frontend client setup

```typescript
import { createDiscogsClient } from "@thisavoropaev/discogs-ts-client";

const client = createDiscogsClient({
  mode: "proxy",
  proxy: {
    url: "https://your-worker.workers.dev",
    autoRetryOnRateLimit: true,
  },
  userCredentials: {
    token: "user-oauth-token",
    tokenSecret: "user-oauth-token-secret",
  },
});

const result = await client.request({
  method: "GET",
  endpoint: "/releases/{release_id}",
  pathParams: { release_id: 249504 },
});

if (result.isOk()) {
  console.log(result.value);
}
```

## Request/Response Format

### Request (POST to worker)

```json
{
  "method": "GET",
  "endpoint": "/releases/{release_id}",
  "pathParams": { "release_id": "249504" },
  "queryParams": { "curr_abbr": "USD" },
  "userCredentials": {
    "token": "user-token",
    "tokenSecret": "user-token-secret"
  }
}
```

### Response (success)

```json
{
  "success": true,
  "data": {/* Discogs API response */},
  "rateLimit": { "limit": 60, "remaining": 58, "used": 2 }
}
```

### Response (error)

```json
{
  "success": false,
  "error": {
    "type": "AUTH_ERROR",
    "message": "Invalid token",
    "statusCode": 401
  }
}
```

## Local development

```bash
wrangler dev
```

Then test with:

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "method": "GET",
    "endpoint": "/releases/{release_id}",
    "pathParams": { "release_id": "249504" },
    "userCredentials": { "token": "...", "tokenSecret": "..." }
  }'
```
