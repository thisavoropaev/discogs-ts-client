# Discogs Proxy Worker with OAuth

Cloudflare Worker that proxies Discogs API calls including OAuth 1.0a flow.

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

## Usage

Single proxy endpoint handles all requests including OAuth.

### Request Token

```typescript
const res = await fetch("https://your-worker.workers.dev", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    method: "POST",
    endpoint: "/oauth/request_token",
    oauthParams: { oauth_callback: "https://yourapp.com/callback" },
  }),
});
const { data } = await res.json();
// data: { oauth_token, oauth_token_secret, oauth_callback_confirmed }
```

### Authorize URL

```typescript
import { getAuthorizeUrl } from "@thisavoropaev/discogs-ts-client";

const authUrl = getAuthorizeUrl(data.oauth_token);
window.location.href = authUrl;
```

### Access Token

After user authorizes:

```typescript
const res = await fetch("https://your-worker.workers.dev", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    method: "POST",
    endpoint: "/oauth/access_token",
    oauthParams: { oauth_verifier: verifier },
    userCredentials: {
      token: requestToken,
      tokenSecret: requestTokenSecret,
    },
  }),
});
const { data } = await res.json();
// data: { oauth_token, oauth_token_secret }
```

### API Calls

```typescript
const res = await fetch("https://your-worker.workers.dev", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    method: "GET",
    endpoint: "/oauth/identity",
    userCredentials: {
      token: accessToken,
      tokenSecret: accessTokenSecret,
    },
  }),
});
```

## Client-Side Flow

1. Call proxy with `/oauth/request_token` endpoint
2. Store `oauth_token_secret` client-side
3. Redirect user to `getAuthorizeUrl(oauth_token)`
4. User authorizes, gets redirected with `oauth_verifier`
5. Call proxy with `/oauth/access_token` endpoint + request credentials
6. Store access tokens securely for API calls
