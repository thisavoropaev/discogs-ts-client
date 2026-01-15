# Discogs OAuth Example Worker

Cloudflare Worker example with OAuth 1.0a flow for Discogs API.

## Setup

```bash
pnpm install
```

## Configure Secrets

```bash
wrangler secret put DISCOGS_CONSUMER_KEY
wrangler secret put DISCOGS_CONSUMER_SECRET
```

## Development

```bash
pnpm dev
```

## Deploy

```bash
pnpm deploy
```

## Endpoints

### POST /request-token

Start OAuth flow.

**Request:**

```json
{ "callback_url": "https://yourapp.com/callback" }
```

**Response:**

```json
{
  "success": true,
  "data": {
    "requestToken": "...",
    "requestTokenSecret": "...",
    "authUrl": "https://discogs.com/oauth/authorize?oauth_token=..."
  }
}
```

### POST /access-token

Exchange request token for access token.

**Request:**

```json
{
  "requestToken": "...",
  "requestTokenSecret": "...",
  "oauthVerifier": "..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "accessTokenSecret": "..."
  }
}
```

### POST /api

Proxy for authenticated Discogs API calls (same as base proxy worker).

## Client-Side Flow

1. Call `/request-token` with callback URL
2. Store `requestTokenSecret` client-side
3. Redirect user to `authUrl`
4. User authorizes, gets redirected to callback with `oauth_token` and
   `oauth_verifier`
5. Call `/access-token` with token, secret, and verifier
6. Store access tokens securely for API calls
