import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const databasePath = process.env.SQLITE_DB_PATH || "./blood-bank-test.db";
const url = databasePath.startsWith("file:") ? databasePath : `file:${databasePath}`;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsSqlite?: ReturnType<typeof createClient>;
};

export const client =
  globalForDb.__arenaNextJsSqlite ??
  createClient({ url });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsSqlite = client;
}

export const db = drizzle(client, { schema });
