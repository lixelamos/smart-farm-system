import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { rows, execute, transaction } from "./db";
import { resources } from "./resources";
import { accountTables, chatKey, type User } from "./domain";
export { HttpError } from "./errors";
import { HttpError } from "./errors";
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .refine((v) => Buffer.byteLength(v) <= 72, "Password is too long.");
export const phoneSchema = z
  .string()
  .regex(/^0?[17]\d{8}$/, "Enter a Kenyan mobile number.");
const now = () => Math.floor(Date.now() / 1000);
export async function audit(user: User, action: string, detail: string) {
  await execute(
    "INSERT INTO sf_audit(role,user_id,action,detail,created) VALUES (?,?,?,?,?)",
    [user.role, user.id, action, detail, now()],
  );
}
export async function listResource(user: User, key: string, afterId?: number) {
  const resource = resources[key];
  if (!resource || !resource.read.includes(user.role))
    throw new HttpError(403, "You do not have access to these records.");
  const columns = [
    "id",
    ...resource.columns
      .filter((c) => c.key !== "farmer_name")
      .map((c) => c.key),
  ];
  if (key === "news") columns.push("author_role", "author_id");
  const alias = ["supplies", "sales", "purchases", "payments"].includes(key);
  let sql = `SELECT ${columns.map((c) => `r.\`${c}\``).join(",")}${alias ? ",f.name AS farmer_name" : ""} FROM \`${resource.table}\` r${alias ? " LEFT JOIN farmers f ON f.id=r.farmer" : ""}`;
  const conditions: string[] = [];
  const args: unknown[] = [];
  if (alias && user.role === "farmer") {
    conditions.push("r.farmer=?");
    args.push(user.id);
  }
  if (key === "inputs" && user.role === "farmer") {
    conditions.push("r.county=?");
    args.push(user.location);
  }
  if (key === "demand" && user.role === "farmer") conditions.push("r.status=0");
  if (afterId) {
    conditions.push("r.id<?");
    args.push(afterId);
  }
  if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
  return rows(sql + " ORDER BY r.id DESC LIMIT 500", args);
}
export async function mutateResource(
  user: User,
  key: string,
  body: Record<string, unknown>,
) {
  const resource = resources[key];
  if (!resource) throw new HttpError(404, "Section not found.");
  const id = Number(body.id) || 0;
  const action = String(body.action ?? "save");
  if (action === "delete") {
    if (!(resource.remove ?? resource.write).includes(user.role))
      throw new HttpError(403, "You cannot delete these records.");
    if (key === "news" && user.role === "agronomist") {
      const [article] = await rows(
        "SELECT author_role,author_id FROM news WHERE id=?",
        [id],
      );
      if (
        article?.author_role !== "agronomist" ||
        Number(article.author_id) !== user.id
      )
        throw new HttpError(403, "You can only remove your own updates.");
    }
    if (["inputs", "products"].includes(key)) {
      const table = key === "inputs" ? "sales" : "purchases";
      const field = key === "inputs" ? "product" : "item";
      const name = key === "inputs" ? "name" : "product";
      const [item] = await rows(
        `SELECT \`${name}\` AS name FROM \`${key}\` WHERE id=?`,
        [id],
      );
      const [history] = await rows(
        `SELECT id FROM \`${table}\` WHERE \`${field}\`=? LIMIT 1`,
        [item?.name ?? ""],
      );
      if (history)
        throw new HttpError(
          409,
          "This item has purchase history. Keep it for the existing records.",
        );
    }
    await execute(`DELETE FROM \`${resource.table}\` WHERE id=?`, [id]);
    await audit(user, "delete:" + key, String(id));
    return;
  }
  if (action === "toggle") {
    if (user.role !== "admin" || !["farmers", "demand"].includes(key))
      throw new HttpError(403, "Only administrators can change this status.");
    const status = z.coerce.number().int().min(0).max(1).parse(body.status);
    await execute(`UPDATE \`${resource.table}\` SET status=? WHERE id=?`, [
      status,
      id,
    ]);
    if (key === "farmers" && status === 0)
      await execute("DELETE FROM sf_sessions WHERE role=? AND user_id=?", [
        "farmer",
        id,
      ]);
    await audit(user, "status:" + key, String(id));
    return;
  }
  if (!resource.write.includes(user.role))
    throw new HttpError(403, "You cannot edit these records.");
  if (key === "news" && id && user.role === "agronomist") {
    const [article] = await rows(
      "SELECT author_role,author_id FROM news WHERE id=?",
      [id],
    );
    if (
      article?.author_role !== "agronomist" ||
      Number(article.author_id) !== user.id
    )
      throw new HttpError(403, "You can only edit your own updates.");
  }
  const values: Record<string, unknown> = {};
  for (const field of resource.fields) {
    if (field.type === "password") {
      if (id) continue;
      values.password = await hash(passwordSchema.parse(body.password), 12);
      continue;
    }
    const value = body[field.name];
    if (field.type === "number") {
      values[field.name] = z.coerce
        .number()
        .finite()
        .min(0)
        .max(1e9)
        .refine((v) => {
          const scale = field.name === "maxsupply" ? 1000 : 100;
          return Math.abs(v * scale - Math.round(v * scale)) < 0.000001;
        }, "Use at most two decimal places for money and three for quantities.")
        .parse(value);
    } else if (field.type === "select") {
      const v = z.string().parse(value);
      if (!field.options?.includes(v))
        throw new HttpError(400, "Choose a valid sub-county.");
      values[field.name] = v;
    } else {
      values[field.name] = z
        .string()
        .trim()
        .min(field.required ? 1 : 0)
        .max(field.type === "textarea" ? 10000 : 255)
        .parse(value ?? "");
    }
  }
  if (values.phone !== undefined)
    values.phone = Number(phoneSchema.parse(String(values.phone)));
  if (values.idno !== undefined)
    values.idno = z.coerce
      .number()
      .int()
      .positive()
      .max(2147483647)
      .parse(values.idno);
  if (
    values.photo !== undefined &&
    values.photo !== "" &&
    !/^\/api\/files\/[a-f0-9-]{36}$/.test(String(values.photo))
  ) {
    const [existing] = id
      ? await rows(`SELECT photo FROM \`${resource.table}\` WHERE id=?`, [id])
      : [];
    if (!existing || existing.photo !== values.photo)
      throw new HttpError(400, "Upload an image using the image field.");
  }
  if (
    typeof values.photo === "string" &&
    values.photo.startsWith("/api/files/")
  ) {
    const [file] = await rows(
      "SELECT scope,owner_role,owner_id FROM sf_files WHERE id=?",
      [values.photo.split("/").at(-1)],
    );
    if (!file || file.scope === "chat")
      throw new HttpError(
        400,
        "Choose a catalogue or profile image, not a private message attachment.",
      );
  }
  if (!id) {
    if (["inputs", "products", "news", "farmers"].includes(key))
      values.time = now();
    if (key === "farmers") values.status = 1;
    if (key === "demand") values.status = 0;
    if (key === "agronomists" && !values.photo) values.photo = "none";
    if (key === "news") {
      values.author_role = user.role;
      values.author_id = user.id;
    }
  }
  const fields = Object.keys(values);
  if (!fields.length) throw new HttpError(400, "No fields supplied.");
  if (id)
    await execute(
      `UPDATE \`${resource.table}\` SET ${fields.map((f) => `\`${f}\`=?`).join(",")} WHERE id=?`,
      [...Object.values(values), id],
    );
  else
    await execute(
      `INSERT INTO \`${resource.table}\` (${fields.map((f) => `\`${f}\``).join(",")}) VALUES (${fields.map(() => "?").join(",")})`,
      Object.values(values),
    );
  await audit(user, (id ? "edit:" : "create:") + key, String(id));
}
export async function createSupply(user: User, body: Record<string, unknown>) {
  if (user.role !== "farmer")
    throw new HttpError(403, "Only farmers can submit produce.");
  const demandId = z.coerce.number().int().positive().parse(body.demandId);
  const stationId = z.coerce.number().int().positive().parse(body.stationId);
  const quantity = z.coerce
    .number()
    .finite()
    .positive()
    .max(1e8)
    .refine(
      (v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 0.000001,
      "Use at most three decimal places for quantities.",
    )
    .parse(body.quantity);
  await transaction(async (c) => {
    const [demand] = await rows(
      "SELECT * FROM demand WHERE id=? FOR UPDATE",
      [demandId],
      c,
    );
    if (!demand || Number(demand.status) !== 0)
      throw new HttpError(409, "This demand is no longer open.");
    if (quantity > Number(demand.maxsupply))
      throw new HttpError(409, "Your quantity exceeds the remaining demand.");
    const [station] = await rows(
      "SELECT * FROM stations WHERE id=? AND county=?",
      [stationId, user.location],
      c,
    );
    if (!station)
      throw new HttpError(400, "Choose a pickup station in your sub-county.");
    const result = await execute(
      "INSERT INTO supplies(farmer,station,produce,quantity,rate,total,status,paid,time) VALUES (?,?,?,?,?,?,0,0,?)",
      [
        user.id,
        station.station,
        demand.product,
        `${quantity} ${demand.measure}`,
        demand.rate,
        (quantity * Number(demand.rate)).toFixed(2),
        now(),
      ],
      c,
    );
    await execute(
      "INSERT INTO sf_supply_demands(supply_id,demand_id,quantity) VALUES (?,?,?)",
      [result.insertId, demandId, quantity],
      c,
    );
    await execute(
      "UPDATE demand SET maxsupply=maxsupply-? WHERE id=?",
      [quantity, demandId],
      c,
    );
  });
}
export async function changeSupply(user: User, id: number, action: string) {
  await transaction(async (c) => {
    const [supply] = await rows(
      "SELECT * FROM supplies WHERE id=? FOR UPDATE",
      [id],
      c,
    );
    if (!supply) throw new HttpError(404, "Supply not found.");
    if (action === "verify") {
      if (user.role !== "admin")
        throw new HttpError(403, "Only administrators verify deliveries.");
      await execute("UPDATE supplies SET status=1 WHERE id=?", [id], c);
      return;
    }
    if (
      action !== "cancel" ||
      user.role !== "farmer" ||
      Number(supply.farmer) !== user.id ||
      Number(supply.status) !== 0 ||
      Number(supply.paid) !== 0
    )
      throw new HttpError(
        403,
        "Only your unverified, unpaid supplies can be cancelled.",
      );
    const [link] = await rows(
      "SELECT demand_id,quantity FROM sf_supply_demands WHERE supply_id=?",
      [id],
      c,
    );
    if (link) {
      await execute(
        "UPDATE demand SET maxsupply=maxsupply+? WHERE id=?",
        [link.quantity, link.demand_id],
        c,
      );
      await execute("DELETE FROM sf_supply_demands WHERE supply_id=?", [id], c);
    }
    await execute("DELETE FROM supplies WHERE id=?", [id], c);
  });
}
export async function orderItem(user: User, body: Record<string, unknown>) {
  if (user.role !== "farmer")
    throw new HttpError(403, "Only farmers can order items.");
  const kind = z.enum(["inputs", "products"]).parse(body.kind);
  const ids = z
    .array(z.number().int().positive())
    .min(1)
    .max(50)
    .parse(body.ids);
  await transaction(async (c) => {
    for (const id of ids) {
      const [item] = await rows(
        `SELECT * FROM \`${kind}\` WHERE id=?`,
        [id],
        c,
      );
      if (
        !item ||
        (kind === "inputs" &&
          String(item.county).toLowerCase() !== user.location.toLowerCase())
      )
        throw new HttpError(
          404,
          "An item is no longer available in your sub-county.",
        );
      if (kind === "inputs")
        await execute(
          "INSERT INTO sales(farmer,product,photo,cost,paid,time) VALUES (?,?,?,?,0,?)",
          [user.id, item.name, item.photo, item.cost, now()],
          c,
        );
      else
        await execute(
          "INSERT INTO purchases(item,photo,details,cost,farmer,day,paid,time) VALUES (?,?,?,?,?,?,0,?)",
          [
            item.product,
            item.photo,
            item.details,
            item.cost,
            user.id,
            new Intl.DateTimeFormat("en-GB", {
              timeZone: "Africa/Nairobi",
            }).format(new Date()),
            now(),
          ],
          c,
        );
    }
  });
}
export async function recordPayment(user: User, body: Record<string, unknown>) {
  if (user.role !== "admin")
    throw new HttpError(403, "Only administrators can record settlement.");
  const kind = z.enum(["supplies", "sales", "purchases"]).parse(body.kind);
  const ids = z
    .array(z.number().int().positive())
    .min(1)
    .max(500)
    .parse(body.ids);
  if (new Set(ids).size !== ids.length)
    throw new HttpError(400, "Duplicate records supplied.");
  const reference = z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{5,100}$/, "Enter a unique transaction reference.")
    .parse(body.reference);
  const mode = z.enum(["Cash", "Bank", "MPESA"]).parse(body.mode);
  await transaction(async (c) => {
    const records = await rows(
      `SELECT * FROM \`${kind}\` WHERE id IN (${ids.map(() => "?").join(",")}) FOR UPDATE`,
      ids,
      c,
    );
    if (
      records.length !== ids.length ||
      records.some((r) => Number(r.paid) !== 0)
    )
      throw new HttpError(
        409,
        "Some records have already been settled. Refresh and try again.",
      );
    if (kind === "supplies" && records.some((r) => Number(r.status) !== 1))
      throw new HttpError(
        409,
        "Verify deliveries before recording their payout.",
      );
    const farmer = Number(records[0].farmer);
    if (records.some((r) => Number(r.farmer) !== farmer))
      throw new HttpError(400, "Settle one farmer at a time.");
    const amount = records.reduce(
      (total, r) => total + Number(kind === "supplies" ? r.total : r.cost),
      0,
    );
    await execute(
      "INSERT INTO sf_payment_refs(reference,farmer_id,amount,created) VALUES (?,?,?,?)",
      [reference, farmer, amount, now()],
      c,
    );
    const payment = await execute(
      "INSERT INTO payments(farmer,description,mode,transaction,amount,time) VALUES (?,?,?,?,?,?)",
      [
        farmer,
        `${kind === "supplies" ? "Produce payout" : "Purchase payment"}: ${kind} records ${ids.join(", ")}`,
        mode,
        reference,
        amount,
        now(),
      ],
      c,
    );
    for (const id of ids)
      await execute(
        "INSERT INTO sf_payment_allocations(payment_id,record_type,record_id) VALUES (?,?,?)",
        [payment.insertId, kind, id],
        c,
      );
    await execute(
      `UPDATE \`${kind}\` SET paid=? WHERE id IN (${ids.map(() => "?").join(",")})`,
      [now(), ...ids],
      c,
    );
  });
  await audit(user, "payment:record", reference);
}
export async function updateAccount(user: User, body: Record<string, unknown>) {
  const name = z.string().trim().min(2).max(255).parse(body.name);
  const identifier = z.string().trim().min(1).max(255).parse(body.identifier);
  const region = z.string().parse(body.location ?? "");
  const table = accountTables[user.role];
  const person = user.role === "farmer" || user.role === "agronomist";
  if (
    person &&
    ![
      "Narok North",
      "Narok East",
      "Narok South",
      "Narok West",
      "Kilgoris",
      "Emurua Dikirr",
    ].includes(region)
  )
    throw new HttpError(400, "Select your sub-county.");
  const fields = person ? ["name", "phone", "location"] : ["username"];
  const values: unknown[] = person
    ? [name, Number(phoneSchema.parse(identifier)), region]
    : [identifier];
  if (body.photo) {
    const photo = z
      .string()
      .regex(/^\/api\/files\/[a-f0-9-]{36}$/)
      .parse(body.photo);
    if (user.role !== "agronomist")
      throw new HttpError(
        400,
        "This account does not support a profile photo.",
      );
    const [file] = await rows(
      "SELECT scope,owner_role,owner_id FROM sf_files WHERE id=?",
      [photo.split("/").at(-1)],
    );
    if (
      !file ||
      file.scope !== "profile" ||
      file.owner_role !== user.role ||
      Number(file.owner_id) !== user.id
    )
      throw new HttpError(403, "Choose your own uploaded profile photo.");
    fields.push("photo");
    values.push(photo);
  }
  if (body.password) {
    const password = passwordSchema.parse(body.password);
    const { passwordMatches } = await import("./auth");
    const [account] = await rows(
      `SELECT password FROM \`${table}\` WHERE id=?`,
      [user.id],
    );
    if (
      !(await passwordMatches(
        String(body.currentPassword ?? ""),
        String(account.password),
      ))
    )
      throw new HttpError(400, "Your current password is incorrect.");
    fields.push("password");
    values.push(await hash(password, 12));
  }
  await transaction(async (c) => {
    await execute(
      `UPDATE \`${table}\` SET ${fields.map((f) => `\`${f}\`=?`).join(",")} WHERE id=?`,
      [...values, user.id],
      c,
    );
    if (body.password) {
      await execute(
        "DELETE FROM sf_sessions WHERE role=? AND user_id=?",
        [user.role, user.id],
        c,
      );
      await execute(
        "DELETE FROM sf_reset_tokens WHERE role=? AND user_id=?",
        [user.role, user.id],
        c,
      );
    }
  });
  return { signedOut: !!body.password };
}
export async function contacts(user: User) {
  if (!["farmer", "agronomist"].includes(user.role))
    throw new HttpError(403, "Messaging is for farmers and agronomists.");
  const table = user.role === "farmer" ? "agronomists" : "farmers";
  const prefix = user.role === "farmer" ? "a-" : "f-";
  const self = chatKey(user);
  return rows(
    `SELECT p.id,p.name,p.location FROM ${table} p WHERE (p.location=?${table === "farmers" ? " AND p.status=1" : ""}) OR EXISTS (SELECT 1 FROM chats c WHERE (c.sender=? AND c.receiver=CONCAT(?,p.id)) OR (c.receiver=? AND c.sender=CONCAT(?,p.id))) ORDER BY p.name`,
    [user.location, self, prefix, self, prefix],
  );
}
export async function messages(user: User, peerId: number) {
  const people = await contacts(user);
  if (!people.some((p) => Number(p.id) === peerId))
    throw new HttpError(403, "Choose a contact in your sub-county.");
  const self = chatKey(user);
  const peer = `${user.role === "farmer" ? "a" : "f"}-${peerId}`;
  await execute("UPDATE chats SET status=1 WHERE sender=? AND receiver=?", [
    peer,
    self,
  ]);
  return rows(
    "SELECT id,sender,receiver,message,type,status,time FROM chats WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?) ORDER BY time ASC,id ASC",
    [self, peer, peer, self],
  );
}
export async function sendMessage(user: User, body: Record<string, unknown>) {
  const peer = z.coerce.number().int().positive().parse(body.peerId);
  await messages(user, peer);
  const text = z
    .string()
    .trim()
    .max(10000)
    .parse(body.message ?? "");
  const photo = z.string().parse(body.photo ?? "");
  if (!text && !photo)
    throw new HttpError(400, "Write a message or attach a photo.");
  if (photo) {
    if (!/^\/api\/files\/[a-f0-9-]{36}$/.test(photo))
      throw new HttpError(400, "Upload the image first.");
    const [file] = await rows(
      "SELECT owner_role,owner_id,peer_id,scope FROM sf_files WHERE id=?",
      [photo.split("/").at(-1)],
    );
    if (
      file?.owner_role !== user.role ||
      Number(file.owner_id) !== user.id ||
      Number(file.peer_id) !== peer ||
      file.scope !== "chat"
    )
      throw new HttpError(
        403,
        "This attachment belongs to another conversation.",
      );
  }
  await execute(
    "INSERT INTO chats(sender,receiver,message,type,status,time) VALUES (?,?,?,?,0,?)",
    [
      chatKey(user),
      `${user.role === "farmer" ? "a" : "f"}-${peer}`,
      text,
      photo || "text",
      now(),
    ],
  );
}
export async function deleteMessage(user: User, id: number) {
  await execute("DELETE FROM chats WHERE id=? AND sender=?", [
    id,
    chatKey(user),
  ]);
}
export async function verifyPurchase(
  user: User,
  body: Record<string, unknown>,
) {
  if (user.role !== "farmer")
    throw new HttpError(
      403,
      "Only farmers can submit purchase payment references.",
    );
  if (!process.env.PAYMENT_VERIFY_URL)
    throw new HttpError(
      503,
      "Online payment verification is not configured. Contact the administrator to record your payment.",
    );
  const url = new URL(process.env.PAYMENT_VERIFY_URL);
  if (url.protocol !== "https:")
    throw new HttpError(503, "Payment verification requires HTTPS.");
  const kind = z.enum(["sales", "purchases"]).parse(body.kind);
  const ids = z
    .array(z.number().int().positive())
    .min(1)
    .max(50)
    .parse(body.ids);
  if (new Set(ids).size !== ids.length)
    throw new HttpError(400, "Duplicate records supplied.");
  const reference = z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{5,100}$/)
    .parse(body.reference);
  const records = await rows(
    `SELECT id,cost FROM ${kind} WHERE farmer=? AND paid=0 AND id IN (${ids.map(() => "?").join(",")})`,
    [user.id, ...ids],
  );
  if (records.length !== ids.length)
    throw new HttpError(409, "Some purchase records are no longer unpaid.");
  const amount = records.reduce((total, r) => total + Number(r.cost), 0);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.PAYMENT_API_KEY
        ? { Authorization: `Bearer ${process.env.PAYMENT_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      reference,
      amount,
      currency: "KES",
      phone: user.identifier,
    }),
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!response.ok)
    throw new HttpError(
      502,
      "The payment provider could not verify this reference.",
    );
  const result = z
    .object({
      verified: z.literal(true),
      reference: z.string(),
      amount: z.number(),
      currency: z.literal("KES"),
    })
    .parse(await response.json());
  if (
    result.reference !== reference ||
    Math.abs(result.amount - amount) > 0.005
  )
    throw new HttpError(400, "The verified payment does not match your order.");
  // Re-lock records and verify ownership/amount before committing the external confirmation.
  await transaction(async (c) => {
    const locked = await rows(
      `SELECT * FROM ${kind} WHERE farmer=? AND id IN (${ids.map(() => "?").join(",")}) FOR UPDATE`,
      [user.id, ...ids],
      c,
    );
    if (
      locked.length !== ids.length ||
      locked.some((r) => Number(r.paid) !== 0) ||
      locked.reduce((t, r) => t + Number(r.cost), 0) !== amount
    )
      throw new HttpError(409, "This order changed or was already paid.");
    await execute(
      "INSERT INTO sf_payment_refs(reference,farmer_id,amount,created) VALUES (?,?,?,?)",
      [reference, user.id, amount, now()],
      c,
    );
    const payment = await execute(
      "INSERT INTO payments(farmer,description,mode,transaction,amount,time) VALUES (?,?,?,?,?,?)",
      [user.id, `Verified ${kind} payment`, "MPESA", reference, amount, now()],
      c,
    );
    for (const id of ids)
      await execute(
        "INSERT INTO sf_payment_allocations(payment_id,record_type,record_id) VALUES (?,?,?)",
        [payment.insertId, kind, id],
        c,
      );
    await execute(
      `UPDATE ${kind} SET paid=? WHERE id IN (${ids.map(() => "?").join(",")})`,
      [now(), ...ids],
      c,
    );
  });
}
export function temporaryPassword() {
  return randomBytes(18).toString("base64url");
}
