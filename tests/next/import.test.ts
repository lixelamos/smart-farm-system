import { test } from "node:test";
import assert from "node:assert/strict";
import { splitStatements } from "../../lib/import-sql";
import { mayAccess, money, chatKey } from "../../lib/domain";
import { passwordMatches } from "../../lib/auth";
import { hash } from "bcryptjs";
test("data dump splitting preserves quoted semicolons and escaped quotes", () => {
  const statements = splitStatements(
    "-- dump\nINSERT INTO news VALUES (1,'a; b', 'it\\'s valid');\n/* comment; */ INSERT INTO products VALUES (2,'more');",
  );
  assert.equal(statements.length, 2);
  assert.match(statements[0], /a; b/);
  assert.match(statements[0], /it\\'s valid/);
});
test("truncated imports are rejected", () => {
  assert.throws(() => splitStatements("INSERT INTO news VALUES ('unfinished"));
});
test("role navigation does not expose administration to farmers", () => {
  assert.equal(mayAccess("farmer", "accounts"), false);
  assert.equal(mayAccess("admin", "accounts"), true);
  assert.equal(mayAccess("agronomist", "payments"), false);
  assert.equal(chatKey({ role: "farmer", id: 8 }), "f-8");
});
test("legacy PHP bcrypt and plaintext credentials remain verifiable", async () => {
  const password = "A private test passphrase";
  const stored = await hash(password, 4);
  assert.equal(
    await passwordMatches(password, stored.replace("$2b$", "$2y$")),
    true,
  );
  assert.equal(await passwordMatches("wrong", stored), false);
  assert.equal(await passwordMatches(password, password), true);
  assert.equal(await passwordMatches(password.toLowerCase(), password), false);
});
test("Kenyan currency formatting retains the amount", () => {
  assert.match(money(1234.5), /1,234\.50/);
});
