import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { readFile, realpath } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { pool, rows, execute } from "../lib/db";
async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN)
    throw new Error(
      "Connect a private Vercel Blob store and set BLOB_READ_WRITE_TOKEN.",
    );
  const root = await realpath(process.argv[2] ?? "photos");
  let uploaded = 0,
    missing = 0;
  const cache = new Map<string, string>();
  async function move(
    filename: string,
    scope: string,
    ownerRole: string,
    ownerId: number,
    peerId: number | null,
  ) {
    if (
      !filename ||
      filename === "none" ||
      filename === "text" ||
      filename.startsWith("/api/files/")
    )
      return filename;
    if (filename.includes("/") || filename.includes("\\")) {
      missing++;
      return null;
    }
    const key = [filename, scope, ownerRole, ownerId, peerId].join(":");
    if (cache.has(key)) return cache.get(key)!;
    let data: Buffer;
    try {
      const path = await realpath(resolve(root, filename));
      if (!path.startsWith(root + sep))
        throw new Error("Outside source directory.");
      data = await readFile(path);
    } catch {
      missing++;
      return null;
    }
    let mime: string, extension: string;
    if (data[0] === 0xff && data[1] === 0xd8) {
      mime = "image/jpeg";
      extension = "jpg";
    } else if (
      data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ) {
      mime = "image/png";
      extension = "png";
    } else if (
      data.subarray(0, 4).toString() === "RIFF" &&
      data.subarray(8, 12).toString() === "WEBP"
    ) {
      mime = "image/webp";
      extension = "webp";
    } else {
      missing++;
      return null;
    }
    const id = randomUUID();
    const blob = await put(`narok/import/${id}.${extension}`, data, {
      access: "private",
      contentType: mime,
      addRandomSuffix: false,
    });
    await execute(
      "INSERT INTO sf_files(id,pathname,owner_role,owner_id,scope,peer_id,mime) VALUES (?,?,?,?,?,?,?)",
      [id, blob.pathname, ownerRole, ownerId, scope, peerId, mime],
    );
    const url = `/api/files/${id}`;
    cache.set(key, url);
    uploaded++;
    return url;
  }
  for (const table of [
    "inputs",
    "products",
    "sales",
    "purchases",
    "agronomists",
  ])
    for (const row of await rows(`SELECT id,photo FROM ${table}`)) {
      const url = await move(
        String(row.photo),
        table === "agronomists" ? "profile" : "catalog",
        table === "agronomists" ? "agronomist" : "admin",
        table === "agronomists" ? Number(row.id) : 0,
        null,
      );
      if (url && url !== row.photo)
        await execute(`UPDATE ${table} SET photo=? WHERE id=?`, [url, row.id]);
    }
  for (const row of await rows(
    "SELECT id,sender,receiver,type FROM chats WHERE type<>'text'",
  )) {
    const sender = String(row.sender).match(/^([af])-(\d+)$/),
      receiver = String(row.receiver).match(/^([af])-(\d+)$/);
    if (!sender || !receiver) {
      missing++;
      continue;
    }
    const url = await move(
      String(row.type),
      "chat",
      sender[1] === "f" ? "farmer" : "agronomist",
      Number(sender[2]),
      Number(receiver[2]),
    );
    if (url && url !== row.type)
      await execute("UPDATE chats SET type=? WHERE id=?", [url, row.id]);
  }
  console.log(
    `Migrated ${uploaded} files. ${missing} missing or unsupported references remain unchanged.`,
  );
  if (missing) process.exitCode = 2;
}
main()
  .then(() => pool().end())
  .catch(async (error) => {
    console.error(
      error instanceof Error ? error.message : "Asset migration failed.",
    );
    await pool().end();
    process.exitCode = 1;
  });
