import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { put, get } from "@vercel/blob";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  sessionUser,
  login,
  logout,
  resetPassword,
  issueReset,
} from "@/lib/auth";
import { rows, execute } from "@/lib/db";
import { accountTables, counties, roles, type User } from "@/lib/domain";
import { resources } from "@/lib/resources";
import {
  HttpError,
  passwordSchema,
  phoneSchema,
  listResource,
  mutateResource,
  createSupply,
  changeSupply,
  orderItem,
  recordPayment,
  updateAccount,
  contacts,
  messages,
  sendMessage,
  deleteMessage,
  verifyPurchase,
  audit,
} from "@/lib/service";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
async function actor() {
  const user = await sessionUser();
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  return user;
}
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = new Set([
    request.nextUrl.origin,
    ...(process.env.APP_URL ? [new URL(process.env.APP_URL).origin] : []),
  ]);
  if (!origin || !allowed.has(origin))
    throw new HttpError(
      403,
      "This request did not come from your application.",
    );
}
async function body(request: NextRequest) {
  if (Number(request.headers.get("content-length")) > 65536)
    throw new HttpError(413, "This request is too large.");
  return z.record(z.string(), z.unknown()).parse(await request.json());
}
function errorResponse(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError)
    return json(
      { error: error.issues[0]?.message ?? "Please check your details." },
      400,
    );
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "ER_DUP_ENTRY"
  )
    return json(
      {
        error:
          "This phone number, ID, or transaction reference is already in use.",
      },
      409,
    );
  console.error(
    "Request failed:",
    error instanceof Error ? error.name : "Unknown error",
  );
  return json(
    { error: "The service could not complete this request. Please try again." },
    500,
  );
}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const path = (await params).path;
    const user = await actor();
    if (path[0] === "me") return json({ user });
    if (path[0] === "data" && path[1]) {
      const cursor = request.nextUrl.searchParams.get("after");
      return json({
        rows: await listResource(
          user,
          path[1],
          cursor ? z.coerce.number().int().positive().parse(cursor) : undefined,
        ),
      });
    }
    if (path[0] === "overview") {
      const staff = ["admin", "manager"].includes(user.role);
      const counts = staff
        ? await rows(
            "SELECT (SELECT COUNT(*) FROM farmers) AS farmers,(SELECT COUNT(*) FROM demand WHERE status=0) AS demand,(SELECT COUNT(*) FROM stations) AS stations",
          )
        : await rows(
            "SELECT (SELECT COUNT(*) FROM demand WHERE status=0) AS demand,(SELECT COUNT(*) FROM inputs WHERE county=?) AS inputs,(SELECT COUNT(*) FROM news) AS news",
            [user.location],
          );
      const latest = await rows(
        "SELECT id,county,source,message,time FROM news ORDER BY time DESC LIMIT 5",
      );
      return json({ counts: counts[0], news: latest });
    }
    if (path[0] === "contacts") return json({ rows: await contacts(user) });
    if (path[0] === "messages") {
      const id = z.coerce
        .number()
        .int()
        .positive()
        .parse(request.nextUrl.searchParams.get("peer"));
      return json({ rows: await messages(user, id) });
    }
    if (path[0] === "accounts") {
      if (user.role !== "admin")
        throw new HttpError(403, "Only administrators can manage recovery.");
      const accounts = [];
      for (const role of roles) {
        const person = role === "farmer" || role === "agronomist";
        for (const row of await rows(
          `SELECT id,${person ? "name,phone" : "username"} FROM \`${accountTables[role]}\` ORDER BY id`,
        ))
          accounts.push({
            id: row.id,
            role,
            name: row.name ?? row.username,
            identifier: row.phone ?? row.username,
          });
      }
      return json({ rows: accounts });
    }
    if (path[0] === "files" && path[1]) {
      const [file] = await rows("SELECT * FROM sf_files WHERE id=?", [path[1]]);
      if (!file) throw new HttpError(404, "Image not found.");
      if (file.scope === "chat") {
        const owner =
          file.owner_role === user.role && Number(file.owner_id) === user.id;
        const peer =
          ((file.owner_role === "farmer" && user.role === "agronomist") ||
            (file.owner_role === "agronomist" && user.role === "farmer")) &&
          Number(file.peer_id) === user.id;
        if (!owner && !peer)
          throw new HttpError(
            403,
            "This image belongs to another conversation.",
          );
      }
      const blob = await get(String(file.pathname), { access: "private" });
      if (!blob || blob.statusCode !== 200)
        throw new HttpError(404, "Image is unavailable.");
      return new Response(blob.stream, {
        headers: {
          "Content-Type": String(file.mime),
          "Cache-Control": "private, max-age=300",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (path[0] === "report" && path[1])
      return await report(
        user,
        path[1],
        request.nextUrl.searchParams.get("format") ?? "csv",
      );
    throw new HttpError(404, "Endpoint not found.");
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    sameOrigin(request);
    const path = (await params).path;
    if (path[0] === "login") {
      const input = await body(request);
      const role = z.enum(roles).parse(input.role);
      const identifier = z
        .string()
        .trim()
        .min(1)
        .max(255)
        .parse(input.identifier);
      const password = z.string().min(1).max(1000).parse(input.password);
      return json(await login(role, identifier, password));
    }
    if (path[0] === "register") {
      const input = await body(request);
      const name = z
        .string()
        .trim()
        .min(3)
        .max(255)
        .refine((v) => v.split(/\s+/).length >= 2, "Enter your full name.")
        .parse(input.name);
      const phone = Number(phoneSchema.parse(input.phone));
      const idno = z.coerce
        .number()
        .int()
        .positive()
        .max(2147483647)
        .parse(input.idno);
      const location = z.enum(counties).parse(input.location);
      const password = await hash(passwordSchema.parse(input.password), 12);
      await execute(
        "INSERT INTO farmers(name,phone,idno,password,location,status,time) VALUES (?,?,?,?,?,0,?)",
        [name, phone, idno, password, location, Math.floor(Date.now() / 1000)],
      );
      return json(
        {
          message:
            "Your account was created and is awaiting administrator approval.",
        },
        201,
      );
    }
    if (path[0] === "reset") {
      const input = await body(request);
      const token = z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .parse(input.token);
      const password = passwordSchema.parse(input.password);
      if (password !== input.confirmation)
        throw new HttpError(400, "The passwords do not match.");
      await resetPassword(token, password);
      return json({ message: "Password updated. You can sign in now." });
    }
    const user = await actor();
    if (path[0] === "logout") {
      await logout();
      return json({ ok: true });
    }
    if (path[0] === "data" && path[1]) {
      await mutateResource(user, path[1], await body(request));
      return json({ message: "Changes saved." });
    }
    if (path[0] === "supplies") {
      const input = await body(request);
      if (input.action)
        await changeSupply(
          user,
          z.coerce.number().int().positive().parse(input.id),
          String(input.action),
        );
      else await createSupply(user, input);
      return json({ message: "Supply record updated." });
    }
    if (path[0] === "orders") {
      await orderItem(user, await body(request));
      return json({
        message:
          "Order recorded. You can review and settle it in your purchase records.",
      });
    }
    if (path[0] === "payments") {
      await recordPayment(user, await body(request));
      return json({
        message:
          "Payment recorded. This did not initiate a bank or mobile-money transfer.",
      });
    }
    if (path[0] === "verify-payment") {
      await verifyPurchase(user, await body(request));
      return json({ message: "Payment verified and recorded." });
    }
    if (path[0] === "account")
      return json(await updateAccount(user, await body(request)));
    if (path[0] === "messages") {
      const input = await body(request);
      if (input.action === "delete")
        await deleteMessage(
          user,
          z.coerce.number().int().positive().parse(input.id),
        );
      else await sendMessage(user, input);
      return json({ message: "Conversation updated." });
    }
    if (path[0] === "recovery") {
      if (user.role !== "admin")
        throw new HttpError(
          403,
          "Only administrators can issue recovery links.",
        );
      const input = await body(request);
      const role = z.enum(roles).parse(input.role);
      const id = z.coerce.number().int().positive().parse(input.id);
      const token = await issueReset(role, id);
      await audit(user, "recovery:issue", `${role}:${id}`);
      return json({
        path: `/reset-password#token=${token}`,
        message:
          "Private recovery link. Expires after 30 minutes and works once.",
      });
    }
    if (path[0] === "upload") {
      if (!process.env.BLOB_READ_WRITE_TOKEN)
        throw new HttpError(
          503,
          "Image storage is not configured. Connect a private Vercel Blob store before uploading.",
        );
      const form = await request.formData();
      const file = form.get("file");
      if (
        !(file instanceof File) ||
        file.size > 3 * 1024 * 1024 ||
        file.size === 0
      )
        throw new HttpError(400, "Choose an image smaller than 3 MB.");
      const scope = z
        .enum(["catalog", "profile", "chat"])
        .parse(form.get("scope"));
      if (
        scope === "catalog" &&
        user.role !== "admin" &&
        user.role !== "manager"
      )
        throw new HttpError(403, "You cannot upload catalogue images.");
      if (scope === "profile" && user.role !== "agronomist")
        throw new HttpError(403, "This profile does not support images.");
      const peer =
        scope === "chat"
          ? z.coerce.number().int().positive().parse(form.get("peerId"))
          : null;
      if (peer) await messages(user, peer);
      const data = Buffer.from(await file.arrayBuffer());
      let mime: string;
      let extension: string;
      if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
        mime = "image/jpeg";
        extension = "jpg";
      } else if (
        data
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ) {
        mime = "image/png";
        extension = "png";
      } else if (
        data.subarray(0, 4).toString() === "RIFF" &&
        data.subarray(8, 12).toString() === "WEBP"
      ) {
        mime = "image/webp";
        extension = "webp";
      } else throw new HttpError(400, "Choose a JPEG, PNG, or WebP image.");
      const id = randomUUID();
      const blob = await put(`narok/${scope}/${id}.${extension}`, data, {
        access: "private",
        contentType: mime,
        addRandomSuffix: false,
      });
      await execute(
        "INSERT INTO sf_files(id,pathname,owner_role,owner_id,scope,peer_id,mime) VALUES (?,?,?,?,?,?,?)",
        [id, blob.pathname, user.role, user.id, scope, peer, mime],
      );
      return json({ url: `/api/files/${id}` }, 201);
    }
    throw new HttpError(404, "Endpoint not found.");
  } catch (error) {
    return errorResponse(error);
  }
}
async function report(user: User, key: string, format: string) {
  const resource = resources[key];
  const data = await listResource(user, key);
  while (data.length && data.length % 500 === 0) {
    const more = await listResource(user, key, Number(data.at(-1)?.id));
    if (!more.length) break;
    data.push(...more);
    if (more.length < 500) break;
  }
  if (!resource) throw new HttpError(404, "Report not found.");
  const fields = resource.columns.filter((c) => c.kind !== "image");
  if (format === "csv") {
    const escape = (value: unknown) =>
      '"' +
      String(value ?? "")
        .replace(/^[=+@\-\t\r]/, "'$&")
        .replace(/"/g, '""') +
      '"';
    const csv = [
      fields.map((c) => escape(c.label)).join(","),
      ...data.map((row) => fields.map((c) => escape(row[c.key])).join(",")),
    ].join("\r\n");
    return new Response("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="narok-${key}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }
  if (format !== "pdf") throw new HttpError(400, "Choose CSV or PDF.");
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const title = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([842, 595]);
  let y = 550;
  const text = (value: unknown) =>
    String(value ?? "").replace(/[^\x20-\x7e]/g, "?");
  page.drawText(`Smart Farm | Narok County - ${resource.title}`, {
    x: 32,
    y,
    size: 17,
    font: title,
    color: rgb(0.4, 0.18, 0.12),
  });
  y -= 25;
  page.drawText(
    `Generated ${new Intl.DateTimeFormat("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium" }).format(new Date())} | ${user.role} records`,
    { x: 32, y, size: 9, font },
  );
  y -= 30;
  const width = 770 / fields.length;
  for (const row of [
    { ...Object.fromEntries(fields.map((c) => [c.key, c.label])) },
    ...data,
  ]) {
    if (y < 45) {
      page = document.addPage([842, 595]);
      y = 550;
    }
    fields.forEach((c, i) =>
      page.drawText(
        text(row[c.key]).slice(0, Math.max(10, Math.floor(width / 5))),
        { x: 32 + i * width, y, size: 8, font },
      ),
    );
    y -= 23;
  }
  return new Response(Buffer.from(await document.save()), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="narok-${key}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
