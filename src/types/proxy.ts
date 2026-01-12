export type UserCredentials = {
  token: string;
  tokenSecret: string;
};

export type ProxyConfig = {
  url: string;
};

export type ProxyRequestBody = {
  method: string;
  endpoint: string;
  pathParams?: Record<string, string | number>;
  queryParams?: Record<string, string | number | boolean>;
  userCredentials: UserCredentials;
};

export type RateLimitInfo = {
  limit: number;
  remaining: number;
  used: number;
};

export type ProxyErrorPayload = {
  type: string;
  message: string;
  statusCode?: number;
};

export type ProxyResponse<T = unknown> =
  | { success: true; data: T; rateLimit?: RateLimitInfo }
  | { success: false; error: ProxyErrorPayload };
