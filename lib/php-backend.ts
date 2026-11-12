import { cookies } from "next/headers";
import type { User } from "./domain";
export function phpEndpoint(path: string, query?: URLSearchParams) {
  const configured = process.env.PHP_API_URL;
  if (!configured || !/^[a-f0-9]{64}$/.test(process.env.PHP_API_KEY ?? ""))
    throw new Error("Configure PHP_API_URL and PHP_API_KEY.");
  const url = new URL(configured);
  if (
    url.protocol !== "https:" &&
    !(
      process.env.NODE_ENV !== "production" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    throw new Error("The PHP API must use HTTPS.");
  url.searchParams.set("route", path);
  query?.forEach((value, key) => {
    if (key !== "route") url.searchParams.set(key, value);
  });
  return url;
}
export async function backendUser(): Promise<User | null> {
  const token = (await cookies()).get("sf_session")?.value;
  if (!token) return null;
  const response = await fetch(phpEndpoint("me"), {
    headers: {
      "X-Smart-Farm-Key": process.env.PHP_API_KEY!,
      Cookie: `sf_session=${encodeURIComponent(token)}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("The PHP backend is unavailable.");
  return (await response.json()).user as User;
}
