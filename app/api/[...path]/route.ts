import { NextRequest, NextResponse } from "next/server";
import { phpEndpoint } from "@/lib/php-backend";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
async function proxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    if (request.method !== "GET") {
      const origin = request.headers.get("origin");
      const allowed = new Set([
        request.nextUrl.origin,
        ...(process.env.APP_URL ? [new URL(process.env.APP_URL).origin] : []),
      ]);
      if (!origin || !allowed.has(origin))
        return NextResponse.json(
          { error: "This request did not come from your application." },
          { status: 403 },
        );
    }
    if (Number(request.headers.get("content-length")) > 4 * 1024 * 1024)
      return NextResponse.json(
        { error: "This upload is too large." },
        { status: 413 },
      );
    const path = (await params).path.join("/");
    const headers = new Headers({
      "X-Smart-Farm-Key": process.env.PHP_API_KEY ?? "",
    });
    const token = request.cookies.get("sf_session")?.value;
    if (token) headers.set("Cookie", `sf_session=${encodeURIComponent(token)}`);
    const type = request.headers.get("content-type");
    if (type) headers.set("Content-Type", type);
    const upstream = await fetch(
      phpEndpoint(path, request.nextUrl.searchParams),
      {
        method: request.method,
        headers,
        body:
          request.method === "GET" ? undefined : await request.arrayBuffer(),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(25000),
      },
    );
    const response = new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
        ...(upstream.headers.get("content-disposition")
          ? {
              "Content-Disposition": upstream.headers.get(
                "content-disposition",
              )!,
            }
          : {}),
      },
    });
    for (const cookie of upstream.headers.getSetCookie()) {
      const match = cookie.match(/^sf_session=([^;]*)/);
      if (match) {
        const age = cookie.match(/max-age=(\d+)/i);
        response.cookies.set("sf_session", decodeURIComponent(match[1]), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: match[1] ? Number(age?.[1] ?? 604800) : 0,
        });
      }
    }
    return response;
  } catch {
    return NextResponse.json(
      {
        error:
          "The PHP backend is unavailable. Check its address and connection settings.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
export { proxy as GET, proxy as POST };
