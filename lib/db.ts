import mysql, {
  type Pool,
  type PoolConnection,
  type RowDataPacket,
  type ResultSetHeader,
} from "mysql2/promise";
import type { RecordRow } from "./domain";
const globalDb = globalThis as unknown as { farmPool?: Pool };
export function pool() {
  if (!globalDb.farmPool) {
    if (!process.env.DATABASE_URL)
      throw new Error("DATABASE_URL is not configured.");
    const url = new URL(process.env.DATABASE_URL);
    const tls = process.env.DATABASE_SSL !== "false";
    if (
      process.env.NODE_ENV === "production" &&
      !tls &&
      !["localhost", "127.0.0.1"].includes(url.hostname)
    )
      throw new Error("TLS is required for the hosted database.");
    globalDb.farmPool = mysql.createPool({
      host: url.hostname,
      port: Number(url.port) || 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: decodeURIComponent(url.pathname.slice(1)),
      ssl: tls
        ? {
            rejectUnauthorized: true,
            ...(process.env.DATABASE_CA
              ? { ca: process.env.DATABASE_CA.replace(/\\n/g, "\n") }
              : {}),
          }
        : undefined,
      connectionLimit: 3,
      waitForConnections: true,
      queueLimit: 20,
      enableKeepAlive: true,
      decimalNumbers: true,
      charset: "utf8mb4",
    });
  }
  return globalDb.farmPool;
}
export async function rows(
  sql: string,
  params: unknown[] = [],
  connection?: PoolConnection,
): Promise<RecordRow[]> {
  const [result] = await (connection ?? pool()).execute<RowDataPacket[]>(
    sql,
    params as Parameters<Pool["execute"]>[1],
  );
  return result as RecordRow[];
}
export async function execute(
  sql: string,
  params: unknown[] = [],
  connection?: PoolConnection,
) {
  const [result] = await (connection ?? pool()).execute<ResultSetHeader>(
    sql,
    params as Parameters<Pool["execute"]>[1],
  );
  return result;
}
export async function transaction<T>(
  work: (connection: PoolConnection) => Promise<T>,
) {
  const connection = await pool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
