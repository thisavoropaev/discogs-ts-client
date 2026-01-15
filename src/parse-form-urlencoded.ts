export const parseFormUrlEncoded = <T extends Record<string, string>>(
  text: string,
): T => {
  if (!text || text.trim() === "") {
    throw new Error("Empty response body");
  }
  if (!text.includes("=")) {
    throw new Error(`Invalid form-urlencoded: "${text.substring(0, 100)}"`);
  }
  return Object.fromEntries(new URLSearchParams(text)) as T;
};
