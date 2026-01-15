export type RequestTokenResponse = {
  oauth_token: string;
  oauth_token_secret: string;
  oauth_callback_confirmed: "true";
};

export type AccessTokenResponse = {
  oauth_token: string;
  oauth_token_secret: string;
};

export type OAuthFlowConfig = {
  consumerKey: string;
  consumerSecret: string;
  userAgent: string;
};
