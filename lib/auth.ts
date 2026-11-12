import { HttpError } from "./errors";
import { cookies } from "next/headers";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { rows, execute, transaction } from "./db";
import { accountTables, type Role, type User } from "./domain";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const now = () => Math.floor(Date.now() / 1000);
export function legacyDecode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}
export async function passwordMatches(password: string, stored: string) {
  if (/^\$2[ayb]\$/.test(stored))
    return compare(password, stored.replace(/^\$2y\$/, "$2b$"));
  const a = Buffer.from(password);
  const b = Buffer.from(stored);
  return a.length === b.length && timingSafeEqual(a, b);
}
export async function sessionUser(): Promise<User | null> {
  const token = (await cookies()).get("sf_session")?.value;
  if (!token) return null;
  const [session] = await rows(
    "SELECT role,user_id FROM sf_sessions WHERE token_hash=? AND expires>?",
    [digest(token), now()],
  );
  if (!session) return null;
  const role = session.role as Role;
  if (!accountTables[role]) return null;
  const [account] = await rows(
    `SELECT * FROM \`${accountTables[role]}\` WHERE id=?`,
    [session.user_id],
  );
  if (!account || (role === "farmer" && Number(account.status) !== 1))
    return null;
  return {
    id: Number(account.id),
    role,
    name: legacyDecode(String(account.name ?? account.username)),
    identifier: String(account.phone ?? account.username),
    location: String(account.location ?? ""),
  };
}
export async function login(role: Role, identifier: string, password: string) {
  const identity = digest(role + ":" + identifier.toLowerCase());
  const [limit] = await rows(
    "SELECT attempts,expires FROM sf_login_limits WHERE identity_hash=?",
    [identity],
  );
  if (limit && Number(limit.expires) > now() && Number(limit.attempts) >= 10)
    throw new HttpError(429, "Too many attempts. Try again in 15 minutes.");
  const table = accountTables[role];
  const column =
    role === "farmer" || role === "agronomist" ? "phone" : "username";
  const [account] = await rows(
    `SELECT * FROM \`${table}\` WHERE \`${column}\`=? LIMIT 1`,
    [identifier],
  );
  if (
    !account ||
    !(await passwordMatches(password, String(account.password)))
  ) {
    await execute(
      "INSERT INTO sf_login_limits(identity_hash,attempts,expires) VALUES (?,1,?) ON DUPLICATE KEY UPDATE attempts=IF(expires<?,1,attempts+1),expires=IF(expires<?,VALUES(expires),expires)",
      [identity, now() + 900, now(), now()],
    );
    throw new HttpError(401, "Incorrect sign-in details.");
  }
  if (role === "farmer" && Number(account.status) !== 1)
    throw new HttpError(
      403,
      "Your farmer account is awaiting administrator approval.",
    );
  // Migrate legacy plaintext credentials at a successful login, without exporting them.
  if (!/^\$2[ayb]\$/.test(String(account.password)))
    await execute(
      `UPDATE \`${table}\` SET password=? WHERE id=? AND BINARY password=?`,
      [await hash(password, 12), account.id, account.password],
    );
  await execute("DELETE FROM sf_login_limits WHERE identity_hash=?", [
    identity,
  ]);
  const token = randomBytes(32).toString("hex");
  await execute(
    "INSERT INTO sf_sessions(token_hash,role,user_id,expires) VALUES (?,?,?,?)",
    [digest(token), role, account.id, now() + 86400 * 7],
  );
  await execute("DELETE FROM sf_sessions WHERE expires<?", [now()]);
  (await cookies()).set("sf_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 604800,
  });
  return { role, id: Number(account.id) };
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get("sf_session")?.value;
  if (token)
    await execute("DELETE FROM sf_sessions WHERE token_hash=?", [
      digest(token),
    ]);
  jar.delete("sf_session");
}
export async function issueReset(role: Role, id: number) {
  const token = randomBytes(32).toString("hex");
  await transaction(async (c) => {
    const [account] = await rows(
      `SELECT id FROM \`${accountTables[role]}\` WHERE id=? FOR UPDATE`,
      [id],
      c,
    );
    if (!account) throw new HttpError(404, "Account not found.");
    await execute(
      "DELETE FROM sf_reset_tokens WHERE role=? AND user_id=?",
      [role, id],
      c,
    );
    await execute(
      "INSERT INTO sf_reset_tokens(token_hash,role,user_id,expires) VALUES (?,?,?,?)",
      [digest(token), role, id, now() + 1800],
      c,
    );
  });
  return token;
}
export async function resetPassword(token: string, password: string) {
  return transaction(async (c) => {
    const [record] = await rows(
      "SELECT role,user_id FROM sf_reset_tokens WHERE token_hash=? AND expires>? FOR UPDATE",
      [digest(token), now()],
      c,
    );
    if (!record)
      throw new HttpError(
        400,
        "This recovery link has expired or has already been used.",
      );
    const role = record.role as Role;
    if (!accountTables[role]) throw new HttpError(400, "Invalid account.");
    await execute(
      `UPDATE \`${accountTables[role]}\` SET password=? WHERE id=?`,
      [await hash(password, 12), record.user_id],
      c,
    );
    await execute(
      "DELETE FROM sf_reset_tokens WHERE role=? AND user_id=?",
      [role, record.user_id],
      c,
    );
    await execute(
      "DELETE FROM sf_sessions WHERE role=? AND user_id=?",
      [role, record.user_id],
      c,
    );
  });
}
