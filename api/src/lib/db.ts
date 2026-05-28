import { Pool } from "pg";
import { getSecret } from "./secrets";

let pool: Pool | undefined;

/**
 * A PostgreSQL connection pool, created lazily and reused across warm Lambda
 * invocations. `max: 1` keeps RDS connection use bounded as Lambda scales out.
 *
 * Two ways to configure the connection:
 *   - `DATABASE_URL` (local dev — direct connection string, no SSL)
 *   - `DB_SECRET_ARN` (production — JSON blob in Secrets Manager)
 */
export async function getPool(): Promise<Pool> {
  if (pool) return pool;

  const directURL = process.env.DATABASE_URL;
  if (directURL) {
    pool = new Pool({
      connectionString: directURL,
      max: 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    return pool;
  }

  const arn = process.env.DB_SECRET_ARN;
  if (!arn) throw new Error("Set DATABASE_URL (local) or DB_SECRET_ARN (AWS)");

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
