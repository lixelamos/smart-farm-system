import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { hash } from "bcryptjs";
import { pool, rows, execute } from "../lib/db";
import { migrate } from "./migrate";
async function main() {
  await migrate();
  const existing = await rows("SELECT id FROM admin LIMIT 1");
  if (existing.length)
    throw new Error(
      "An administrator already exists. Bootstrap did not change any accounts.",
    );
  const password = process.env.BOOTSTRAP_PASSWORD ?? "";
  const username = process.env.BOOTSTRAP_USERNAME ?? "admin";
  if (password.length < 12 || Buffer.byteLength(password) > 72)
    throw new Error("Supply BOOTSTRAP_PASSWORD with at least 12 characters.");
  await execute("INSERT INTO admin(username,password) VALUES (?,?)", [
    username,
    await hash(password, 12),
  ]);
  console.log(
    "Administrator created. No sample users or farm records were added.",
  );
}
main()
  .then(() => pool().end())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : "Bootstrap failed.");
    await pool().end();
    process.exitCode = 1;
  });
