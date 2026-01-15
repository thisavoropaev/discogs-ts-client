export const parseFormUrlEncoded = <T extends Record<string, string>>(
  text: string,
): T => Object.fromEntries(new URLSearchParams(text)) as T;
