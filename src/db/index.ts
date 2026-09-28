import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { EMBEDDED_SCHEMA_SQL } from "./embedded-schema";

type Db = NodePgDatabase<typeof schema>;

const pglitePath = process.env.PGLITE_PATH?.trim();
const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlDb?: Db;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  __mpPgLiteClient?: any;
  __mpPgLiteDb?: Db;
  __mpPgLiteReady?: Promise<void>;
};

if (pglitePath) {
  // STRICT SINGLETON: Initialize PGlite only ONCE in the Node process lifetime!
  if (!globalForDb.__mpPgLiteClient) {
    const path = require("node:path");
    const fs = require("node:fs");
    const dataDir = path.isAbsolute(pglitePath)
      ? pglitePath
      : path.join(process.cwd(), pglitePath);
    fs.mkdirSync(dataDir, { recursive: true });

    const { PGlite } = require("@electric-sql/pglite");
    const { drizzle: drizzlePgLite } = require("drizzle-orm/pglite");
    const client = new PGlite(dataDir);
    globalForDb.__mpPgLiteClient = client;

    const instance = drizzlePgLite(client as never, { schema } as never) as unknown as Db;
    globalForDb.__mpPgLiteDb = instance;

    const ready = (async () => {
      try {
        await client.exec(EMBEDDED_SCHEMA_SQL);
      } catch (e) {
        console.error("Embedded schema init error:", e);
      }
    })();
    globalForDb.__mpPgLiteReady = ready;
  }
} else {
  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    if (!databaseUrl) {
      throw new Error("Set DATABASE_URL (PostgreSQL, Railway, etc.) or PGLITE_PATH (embedded desktop database).");
    }
    // SSL configuration: Railway and cloud databases supply sslmode or self-signed certs
    const isLocalhost = databaseUrl.includes("127.0.0.1") || databaseUrl.includes("localhost");
    const poolConfig = {
      connectionString: databaseUrl,
      ssl: isLocalhost ? false : { rejectUnauthorized: false },
    };
    const pgPool = new Pool(poolConfig);
    globalForDb.__arenaNextJsPostgresqlPool = pgPool;
    globalForDb.__arenaNextJsPostgresqlDb = drizzle(pgPool, { schema });
  }
}

// Proxy wrapper: ALWAYS forwards to the singleton DB instance
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const targetDb = pglitePath ? globalForDb.__mpPgLiteDb : globalForDb.__arenaNextJsPostgresqlDb;
    // @ts-ignore
    const val = targetDb?.[prop];
    if (typeof val === "function") {
      return val.bind(targetDb);
    }
    return val;
  },
});

export const pool: Pool | null = globalForDb.__arenaNextJsPostgresqlPool ?? null;

export async function ensureDbReady(): Promise<void> {
  if (pglitePath && globalForDb.__mpPgLiteReady) {
    await globalForDb.__mpPgLiteReady;
  } else if (!pglitePath && databaseUrl) {
    // When running on PostgreSQL (like Railway), auto-run schema creation if tables do not exist
    try {
      if (globalForDb.__arenaNextJsPostgresqlPool) {
        await globalForDb.__arenaNextJsPostgresqlPool.query(EMBEDDED_SCHEMA_SQL);
      }
    } catch (e) {
      console.error("Auto schema init on PostgreSQL:", e);
    }
  }
}

export { schema };
