import { test } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });
import { randomBytes } from "node:crypto";
import { rows, execute, pool } from "../../lib/db";
import { digest } from "../../lib/auth";
const enabled = process.env.RUN_INTEGRATION_TESTS === "1";
test(
  "role authorization, registration, produce, purchases, payments, chat, recovery, and reports",
  { skip: !enabled, timeout: 180000 },
  async () => {
    const origin = process.env.APP_URL ?? "http://localhost:3000";
    const suffix = randomBytes(5).toString("hex");
    const name = "Migration test " + suffix;
    const password = "Private integration passphrase " + suffix;
    const phone = "071" + String(Math.floor(1e6 + Math.random() * 9e6));
    const secondPhone = "072" + phone.slice(-7);
    const identifier = Number(String(Math.floor(1e7 + Math.random() * 1e7)));
    const sessions: string[] = [];
    const farmerIds: number[] = [];
    let agronomistId = 0;
    let demandId = 0;
    let supplyId = 0;
    let stationId = 0;
    let inputId = 0;
    let productId = 0;
    let articleId = 0;
    async function request(path: string, data?: unknown, cookie = "") {
      return fetch(origin + "/api/" + path, {
        method: data === undefined ? "GET" : "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
    }
    async function ok(path: string, data?: unknown, cookie = "") {
      const response = await request(path, data, cookie);
      assert(
        response.ok,
        `${path}: ${response.status} ${await response.clone().text()}`,
      );
      return response.json();
    }
    async function login(role: string, identifier: string, password: string) {
      const response = await request("login", { role, identifier, password });
      assert.equal(response.status, 200);
      const cookie = response.headers
        .getSetCookie()
        .find((v) => v.startsWith("sf_session="))!
        .split(";")[0];
      sessions.push(cookie.split("=")[1]);
      return cookie;
    }
    try {
      assert.equal((await request("data/farmers")).status, 401);
      const adminIdentifier = process.env.TEST_ADMIN_USERNAME ?? "amos";
      const adminPassword = process.env.TEST_ADMIN_PASSWORD ?? "admin";
      const admin = await login("admin", adminIdentifier, adminPassword);
      for (const [p, n, id] of [
        [phone, name, identifier],
        [secondPhone, name + " two", identifier + 1],
      ] as const) {
        await ok("register", {
          name: n,
          phone: p,
          idno: id,
          location: "Narok East",
          password,
        });
        const [farmer] = await rows(
          "SELECT id,password FROM farmers WHERE phone=?",
          [Number(p)],
        );
        assert.match(String(farmer.password), /^\$2/);
        farmerIds.push(Number(farmer.id));
      }
      assert.equal(
        (
          await request("login", {
            role: "farmer",
            identifier: phone,
            password,
          })
        ).status,
        403,
        "Pending farmer cannot sign in",
      );
      for (const id of farmerIds)
        await ok("data/farmers", { action: "toggle", id, status: 1 }, admin);
      const farmer = await login("farmer", phone, password);
      const otherFarmer = await login("farmer", secondPhone, password);
      assert.equal(
        (await request("data/farmers", undefined, farmer)).status,
        403,
      );
      assert.equal(
        (
          await request(
            "data/demand",
            { product: "Unauthorised", measure: "kg", rate: 1, maxsupply: 1 },
            farmer,
          )
        ).status,
        403,
      );
      const noOrigin = await fetch(origin + "/api/data/demand", {
        method: "POST",
        headers: { Cookie: admin, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      assert.equal(noOrigin.status, 403, "Cross-origin mutations are rejected");
      await ok("data/stations", { station: name, county: "Narok East" }, admin);
      stationId = Number(
        (await rows("SELECT id FROM stations WHERE station=?", [name]))[0].id,
      );
      await ok(
        "data/demand",
        { product: name, measure: "kg", rate: 100.5, maxsupply: 10 },
        admin,
      );
      demandId = Number(
        (await rows("SELECT id FROM demand WHERE product=?", [name]))[0].id,
      );
      assert.equal(
        (
          await request(
            "supplies",
            { demandId, stationId, quantity: 11 },
            farmer,
          )
        ).status,
        409,
      );
      await ok("supplies", { demandId, stationId, quantity: 2 }, farmer);
      supplyId = Number(
        (
          await rows("SELECT id,total FROM supplies WHERE farmer=?", [
            farmerIds[0],
          ])
        )[0].id,
      );
      assert.equal(
        Number(
          (await rows("SELECT maxsupply FROM demand WHERE id=?", [demandId]))[0]
            .maxsupply,
        ),
        8,
      );
      assert.equal(
        (
          await request(
            "supplies",
            { id: supplyId, action: "cancel" },
            otherFarmer,
          )
        ).status,
        403,
      );
      await ok("supplies", { id: supplyId, action: "cancel" }, farmer);
      supplyId = 0;
      assert.equal(
        Number(
          (await rows("SELECT maxsupply FROM demand WHERE id=?", [demandId]))[0]
            .maxsupply,
        ),
        10,
        "Cancellation restores demand",
      );
      await ok("supplies", { demandId, stationId, quantity: 2 }, farmer);
      supplyId = Number(
        (
          await rows("SELECT id FROM supplies WHERE farmer=?", [farmerIds[0]])
        )[0].id,
      );
      assert.equal(
        (
          await request(
            "payments",
            {
              kind: "supplies",
              ids: [supplyId],
              mode: "Cash",
              reference: "unverified-" + suffix,
            },
            admin,
          )
        ).status,
        409,
      );
      await ok("supplies", { id: supplyId, action: "verify" }, admin);
      await ok(
        "payments",
        {
          kind: "supplies",
          ids: [supplyId],
          mode: "Cash",
          reference: "payout-" + suffix,
        },
        admin,
      );
      assert.equal(
        (
          await request(
            "payments",
            {
              kind: "supplies",
              ids: [supplyId],
              mode: "Cash",
              reference: "again-" + suffix,
            },
            admin,
          )
        ).status,
        409,
        "A record cannot be settled twice",
      );
      const [payment] = await rows(
        "SELECT amount FROM payments WHERE farmer=?",
        [farmerIds[0]],
      );
      assert.equal(Number(payment.amount), 201);
      const isolated = await ok("data/supplies", undefined, otherFarmer);
      assert.equal(
        isolated.rows.length,
        0,
        "Farmers cannot read another farmer’s records",
      );
      await ok(
        "data/inputs",
        {
          name,
          details: "Integration input",
          cost: 25,
          county: "Narok East",
          photo: "",
        },
        admin,
      );
      inputId = Number(
        (await rows("SELECT id FROM inputs WHERE name=?", [name]))[0].id,
      );
      await ok(
        "data/products",
        { product: name, details: "Integration product", cost: 30, photo: "" },
        admin,
      );
      productId = Number(
        (await rows("SELECT id FROM products WHERE product=?", [name]))[0].id,
      );
      await ok("orders", { kind: "inputs", ids: [inputId] }, farmer);
      await ok("orders", { kind: "products", ids: [productId] }, farmer);
      const [sale] = await rows("SELECT id FROM sales WHERE farmer=?", [
        farmerIds[0],
      ]);
      await ok(
        "payments",
        {
          kind: "sales",
          ids: [Number(sale.id)],
          mode: "Cash",
          reference: "purchase-" + suffix,
        },
        admin,
      );
      const payouts = await ok("data/payments", undefined, farmer);
      assert.equal(payouts.rows.length, 2);
      assert.equal(
        (await request("report/payments?format=csv", undefined, otherFarmer))
          .status,
        200,
      );
      const csv = await request(
        "report/payments?format=csv",
        undefined,
        farmer,
      );
      assert.match(await csv.text(), /payout-/);
      const pdf = await request(
        "report/payments?format=pdf",
        undefined,
        farmer,
      );
      assert.equal((await pdf.arrayBuffer()).byteLength > 500, true);
      const [managerAccount] = await rows("SELECT id FROM manager LIMIT 1");
      assert(managerAccount);
      // Temporary agronomist fixture avoids modifying any imported account.
      const { hash } = await import("bcryptjs");
      const result = await execute(
        "INSERT INTO agronomists(name,phone,password,photo,location) VALUES (?,?,?,?,?)",
        [
          name,
          Number("073" + phone.slice(-7)),
          await hash(password, 4),
          "none",
          "Narok East",
        ],
      );
      agronomistId = result.insertId;
      const agronomist = await login(
        "agronomist",
        "073" + phone.slice(-7),
        password,
      );
      await ok(
        "messages",
        { peerId: agronomistId, message: "A question from the farm." },
        farmer,
      );
      const conversation = await ok(
        "messages?peer=" + farmerIds[0],
        undefined,
        agronomist,
      );
      assert.equal(conversation.rows.length, 1);
      await ok(
        "messages",
        { peerId: farmerIds[0], message: "Local agronomist advice." },
        agronomist,
      );
      assert.equal(
        (
          await request(
            "messages",
            { action: "delete", id: conversation.rows[0].id },
            agronomist,
          )
        ).status,
        200,
      );
      assert.equal(
        (await ok("messages?peer=" + agronomistId, undefined, farmer)).rows
          .length,
        2,
        "A recipient cannot delete the sender’s message",
      );
      await ok(
        "data/news",
        {
          county: "Narok East",
          source: name,
          message: "A practical county update.",
        },
        agronomist,
      );
      articleId = Number(
        (await rows("SELECT id FROM news WHERE source=?", [name]))[0].id,
      );
      assert.equal(
        (
          await request(
            "recovery",
            { role: "farmer", id: farmerIds[0] },
            farmer,
          )
        ).status,
        403,
      );
      const recovery = await ok(
        "recovery",
        { role: "farmer", id: farmerIds[0] },
        admin,
      );
      const token = recovery.path.split("token=")[1];
      assert.equal(
        (
          await request("reset", {
            token,
            password: "short",
            confirmation: "short",
          })
        ).status,
        400,
      );
      const newPassword = "A replacement private passphrase " + suffix;
      await ok("reset", {
        token,
        password: newPassword,
        confirmation: newPassword,
      });
      assert.equal(
        (await request("me", undefined, farmer)).status,
        401,
        "Reset revokes previous sessions",
      );
      assert.equal(
        (
          await request("reset", {
            token,
            password: newPassword,
            confirmation: newPassword,
          })
        ).status,
        400,
        "Recovery is single-use",
      );
      assert.equal(
        (
          await request("login", {
            role: "farmer",
            identifier: phone,
            password,
          })
        ).status,
        401,
      );
      await login("farmer", phone, newPassword);
      assert.equal(
        (await request("report/farmers?format=csv", undefined, otherFarmer))
          .status,
        403,
      );
    } finally {
      for (const token of sessions)
        await execute("DELETE FROM sf_sessions WHERE token_hash=?", [
          digest(token),
        ]);
      if (articleId) await execute("DELETE FROM news WHERE id=?", [articleId]);
      for (const id of farmerIds) {
        for (const table of ["sf_reset_tokens", "sf_sessions"])
          await execute(`DELETE FROM ${table} WHERE role=? AND user_id=?`, [
            "farmer",
            id,
          ]);
        await execute(
          "DELETE a FROM sf_payment_allocations a INNER JOIN payments p ON p.id=a.payment_id WHERE p.farmer=?",
          [id],
        );
        for (const table of [
          "sf_payment_refs",
          "payments",
          "sales",
          "purchases",
          "supplies",
        ])
          await execute(
            `DELETE FROM ${table} WHERE ${table === "sf_payment_refs" ? "farmer_id" : "farmer"}=?`,
            [id],
          );
        await execute("DELETE FROM chats WHERE sender=? OR receiver=?", [
          "f-" + id,
          "f-" + id,
        ]);
        await execute("DELETE FROM farmers WHERE id=?", [id]);
      }
      if (agronomistId) {
        await execute("DELETE FROM sf_sessions WHERE role=? AND user_id=?", [
          "agronomist",
          agronomistId,
        ]);
        await execute("DELETE FROM agronomists WHERE id=?", [agronomistId]);
      }
      if (supplyId)
        await execute("DELETE FROM sf_supply_demands WHERE supply_id=?", [
          supplyId,
        ]);
      if (demandId) {
        await execute("DELETE FROM sf_supply_demands WHERE demand_id=?", [
          demandId,
        ]);
        await execute("DELETE FROM demand WHERE id=?", [demandId]);
      }
      if (stationId)
        await execute("DELETE FROM stations WHERE id=?", [stationId]);
      if (inputId) await execute("DELETE FROM inputs WHERE id=?", [inputId]);
      if (productId)
        await execute("DELETE FROM products WHERE id=?", [productId]);
      await pool().end();
    }
  },
);
