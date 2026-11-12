import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { pool, rows } from "../lib/db";
async function main() {
  for (const table of [
    "admin",
    "manager",
    "farmers",
    "agronomists",
    "demand",
    "inputs",
    "products",
    "news",
    "stations",
    "supplies",
    "purchases",
    "sales",
    "payments",
    "chats",
  ]) {
    const [r] = await rows(`SELECT COUNT(*) AS count FROM ${table}`);
    console.log(`${table}: ${r.count}`);
  }
  for (const table of ["admin", "manager", "farmers", "agronomists"]) {
    const [r] = await rows(
      `SELECT COUNT(*) AS count FROM ${table} WHERE password NOT LIKE '$2%'`,
    );
    console.log(
      `${table} legacy passwords requiring a successful sign-in upgrade: ${r.count}`,
    );
  }
}
main()
  .then(() => pool().end())
  .catch(async () => {
    console.error("Database check failed.");
    await pool().end();
    process.exitCode = 1;
  });
