import { Pool } from "pg";
import { getSecret } from "./secrets";

let pool: Pool | undefined;

/**
 * A PostgreSQL connection pool, created lazily and reused across warm Lambda
 * invocations. `max: 1` keeps RDS connection use bounded as Lambda scales out.
 */
export async function getPool(): Promise<Pool> {
  if (pool) return pool;

  const arn = process.env.DB_SECRET_ARN;
  if (!arn) throw new Error("DB_SECRET_ARN is not set");

  const s = await getSecret(arn);
  pool = new Pool({
    host: s.host,
    port: Number(s.port),
    database: s.dbname,
    user: s.username,
    password: s.password,
    max: 1,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    // RDS is in-VPC; pin the RDS CA bundle here before production.
    ssl: { rejectUnauthorized: false },
  });
  return pool;
}

/** True when a pg error is a unique-constraint violation. */
export function isUniqueViolation(err: unknown): err is { code: string; constraint?: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: unknown }).code === "23505"
  );
}
