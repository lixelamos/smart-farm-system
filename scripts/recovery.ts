import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { issueReset } from "../lib/auth";
import { accountTables, roles, type Role } from "../lib/domain";
import { pool, rows } from "../lib/db";
async function main() {
  const role = process.argv[2] as Role;
  const identifier = process.argv[3];
  if (!roles.includes(role) || !identifier)
    throw new Error(
      "Usage: npm run db:recovery -- manager USERNAME (or another role and its username/phone)",
    );
  const field =
    role === "farmer" || role === "agronomist" ? "phone" : "username";
  const [account] = await rows(
    `SELECT id FROM \`${accountTables[role]}\` WHERE \`${field}\`=?`,
    [identifier],
  );
  if (!account) throw new Error("Account not found.");
  const token = await issueReset(role, Number(account.id));
  console.log(
    `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password#token=${token}`,
  );
  console.log(
    "Private recovery link. Expires after 30 minutes. Do not share publicly.",
  );
}
main()
  .then(() => pool().end())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : "Recovery failed.");
    await pool().end();
    process.exitCode = 1;
  });
