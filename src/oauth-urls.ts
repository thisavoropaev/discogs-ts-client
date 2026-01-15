const DISCOGS_AUTH_URL = "https://discogs.com";

export const getAuthorizeUrl = (requestToken: string): string =>
  `${DISCOGS_AUTH_URL}/oauth/authorize?oauth_token=${
    encodeURIComponent(requestToken)
  }`;
