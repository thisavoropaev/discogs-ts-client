import type { QueryParams } from "./types/common.ts";

export const buildPath = (
  endpoint: string,
  pathParams: Record<string, string> | undefined,
): string => {
  let path = endpoint;

  if (pathParams) {
    for (const [key, value] of Object.entries(pathParams)) {
      path = path.replace(`:${key}`, value);
    }
  }

  const missingParams = path.match(/:([a-zA-Z_]+)/g);
  if (missingParams) {
    throw new Error(
      `Missing path parameters: ${missingParams.join(", ")}`,
    );
  }

  return path;
};

export const buildRequestUrl = (
  initialUrl: string,
  queryParams?: QueryParams,
) => {
  const url = new URL(initialUrl);

  if (queryParams) {
    Object.entries(queryParams).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  return url.toString();
};
