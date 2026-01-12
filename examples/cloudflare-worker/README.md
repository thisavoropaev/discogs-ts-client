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
  "data": {/* Discogs API response */}
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

### 1. Create `.dev.vars` file

Create a `.dev.vars` file in this directory with your Discogs credentials:

```
DISCOGS_CONSUMER_KEY=your_consumer_key
DISCOGS_CONSUMER_SECRET=your_consumer_secret
```

This file is automatically ignored by git and loaded by wrangler during local
development.

### 2. Start the dev server

```bash
wrangler dev
```

### 3. Test with curl

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
