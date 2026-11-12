import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { readFile } from "node:fs/promises";
import { hash } from "bcryptjs";
import { pool, rows, execute, transaction } from "../lib/db";
import { splitStatements } from "../lib/import-sql";
import { migrate } from "./migrate";
const tables = [
  "admin",
  "manager",
  "farmers",
  "agronomists",
  "chats",
  "demand",
  "inputs",
  "news",
  "payments",
  "products",
  "purchases",
  "sales",
  "stations",
  "supplies",
];
async function main() {
  const file = process.argv[2];
  if (!file)
    throw new Error("Usage: npm run db:import -- /path/to/data-only-dump.sql");
  await migrate();
  const inserts = splitStatements(await readFile(file, "utf8"))
    .filter((sql) => /^INSERT\s+INTO\s+/i.test(sql))
    .map((sql) => {
      const match = sql.match(
        /^INSERT\s+INTO\s+`?([a-z_]+)`?\s*(?:\(|VALUES)/i,
      );
      if (!match || !tables.includes(match[1])) return null;
      return { table: match[1], sql };
    })
    .filter((item): item is { table: string; sql: string } => item !== null);
  if (!inserts.length) throw new Error("No supported legacy records found.");
  await transaction(async (c) => {
    for (const table of tables) {
      const [count] = await rows(
        `SELECT COUNT(*) AS n FROM \`${table}\``,
        [],
        c,
      );
      if (Number(count.n) > 0)
        throw new Error(
          "The destination is not empty. Import into a fresh database or use the existing database directly. Nothing was replaced.",
        );
    }
    for (const insert of inserts) await c.query(insert.sql);
    for (const table of ["admin", "manager", "farmers", "agronomists"])
      for (const account of await rows(
        `SELECT id,password FROM \`${table}\``,
        [],
        c,
      ))
        if (!/^\$2[ayb]\$/.test(String(account.password)))
          await execute(
            `UPDATE \`${table}\` SET password=? WHERE id=?`,
            [await hash(String(account.password), 12), account.id],
            c,
          );
  });
  await execute(
    "INSERT IGNORE INTO sf_payment_refs(reference,farmer_id,amount,created) SELECT transaction,MIN(farmer),SUM(amount),MIN(time) FROM payments WHERE transaction<>'' GROUP BY transaction",
  );
  for (const table of tables) {
    const [count] = await rows(`SELECT COUNT(*) AS n FROM \`${table}\``);
    console.log(`${table}: ${count.n} retained records`);
  }
  console.log(
    "Import complete. IDs and relations retained; plaintext passwords upgraded to hashes.",
  );
}
main()
  .then(() => pool().end())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : "Import failed.");
    await pool().end();
    process.exitCode = 1;
  });
