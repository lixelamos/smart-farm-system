export async function api<T = Record<string, unknown>>(
  path: string,
  data?: unknown,
): Promise<T> {
  const form = data instanceof FormData;
  const response = await fetch(`/api/${path}`, {
    method: data === undefined ? "GET" : "POST",
    headers: form ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : form ? data : JSON.stringify(data),
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error ?? "This request could not be completed.");
  return result as T;
}
