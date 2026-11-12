import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { pool, execute, rows } from "../lib/db";
import { legacySchema } from "../lib/schema";
export async function migrate() {
  for (const statement of legacySchema) await execute(statement);
  for (const table of ["admin", "manager", "farmers", "agronomists"])
    await execute(
      `ALTER TABLE \`${table}\` MODIFY password VARCHAR(255) NOT NULL`,
    );
  const statements = [
    `CREATE TABLE IF NOT EXISTS sf_sessions (token_hash CHAR(64) PRIMARY KEY, role VARCHAR(16) NOT NULL, user_id INT NOT NULL, expires BIGINT NOT NULL, INDEX account_session(role,user_id), INDEX session_expiry(expires)) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS sf_reset_tokens (token_hash CHAR(64) PRIMARY KEY, role VARCHAR(16) NOT NULL, user_id INT NOT NULL, expires BIGINT NOT NULL, INDEX reset_account(role,user_id)) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS sf_login_limits (identity_hash CHAR(64) PRIMARY KEY, attempts INT NOT NULL DEFAULT 0, expires BIGINT NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS sf_files (id CHAR(36) PRIMARY KEY, pathname VARCHAR(1024) NOT NULL, owner_role VARCHAR(16) NOT NULL, owner_id INT NOT NULL, scope VARCHAR(16) NOT NULL, peer_id INT NULL, mime VARCHAR(64) NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS sf_audit (id BIGINT AUTO_INCREMENT PRIMARY KEY, role VARCHAR(16) NOT NULL, user_id INT NOT NULL, action VARCHAR(80) NOT NULL, detail VARCHAR(255) NOT NULL, created BIGINT NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS sf_supply_demands (supply_id INT PRIMARY KEY, demand_id INT NOT NULL, quantity DECIMAL(18,3) NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS sf_payment_refs (reference VARCHAR(100) PRIMARY KEY, farmer_id INT NOT NULL, amount DECIMAL(18,2) NOT NULL, created BIGINT NOT NULL) ENGINE=InnoDB`,
    `CREATE TABLE IF NOT EXISTS sf_payment_allocations (payment_id INT NOT NULL, record_type VARCHAR(16) NOT NULL, record_id INT NOT NULL, PRIMARY KEY(record_type,record_id)) ENGINE=InnoDB`,
  ];
  for (const statement of statements) await execute(statement);
  // Preserve existing data. No seeded passwords or sample farm records are inserted.
  for (const table of [
    "inputs",
    "products",
    "agronomists",
    "purchases",
    "sales",
  ]) {
    const column = await rows(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?",
      [table, "photo"],
    );
    if (column.length)
      await execute(
        `ALTER TABLE \`${table}\` MODIFY photo VARCHAR(1024) NOT NULL`,
      );
  }
  const news = await rows("SHOW COLUMNS FROM news");
  if (!news.some((r) => r.Field === "author_role"))
    await execute(
      "ALTER TABLE news ADD COLUMN author_role VARCHAR(16) NULL, ADD COLUMN author_id INT NULL",
    );
  for (const table of ["farmers", "agronomists"]) {
    const indexes = await rows(
      `SHOW INDEX FROM \`${table}\` WHERE Column_name='phone' AND Non_unique=0`,
    );
    if (!indexes.length)
      await execute(
        `ALTER TABLE \`${table}\` ADD UNIQUE KEY sf_unique_phone(phone)`,
      );
  }
  const nationalIds = await rows(
    "SHOW INDEX FROM farmers WHERE Column_name='idno' AND Non_unique=0",
  );
  if (!nationalIds.length)
    await execute("ALTER TABLE farmers ADD UNIQUE KEY sf_unique_idno(idno)");
  for (const table of ["admin", "manager"]) {
    const indexes = await rows(
      `SHOW INDEX FROM \`${table}\` WHERE Column_name='username' AND Non_unique=0`,
    );
    if (!indexes.length)
      await execute(
        `ALTER TABLE \`${table}\` ADD UNIQUE KEY sf_unique_username(username)`,
      );
  }
  for (const [table, column] of [
    ["inputs", "cost"],
    ["products", "cost"],
    ["sales", "cost"],
    ["purchases", "cost"],
    ["payments", "amount"],
    ["demand", "rate"],
    ["demand", "maxsupply"],
  ])
    await execute(
      `ALTER TABLE \`${table}\` MODIFY \`${column}\` DECIMAL(18,${column === "maxsupply" ? 3 : 2}) NOT NULL`,
    );
  for (const table of [
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
  ]) {
    const [state] = await rows(
      "SELECT TABLE_COLLATION AS collation FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",
      [table],
    );
    if (!String(state.collation).startsWith("utf8mb4"))
      await execute(
        `ALTER TABLE \`${table}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );
  }
  await execute(
    "INSERT IGNORE INTO sf_payment_refs(reference,farmer_id,amount,created) SELECT transaction,MIN(farmer),SUM(amount),MIN(time) FROM payments WHERE transaction<>'' GROUP BY transaction",
  );
  console.log("Schema ready. Existing records were retained.");
}
if (process.argv[1]?.endsWith("migrate.ts"))
  migrate()
    .then(() => pool().end())
    .catch(async () => {
      console.error(
        "Migration failed. Check database access and schema permissions.",
      );
      await pool().end();
      process.exitCode = 1;
    });
