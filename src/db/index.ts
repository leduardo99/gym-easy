import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import { getServerEnv } from "@/lib/env";

import { postgresClientOptions } from "./driver";
import { repairPostgresJsSerializers } from "./postgres";
import * as schema from "./schema";

const clients = new Map<string, Sql>();

export function createDb(databaseUrl: string) {
  const env = getServerEnv();
  let client = clients.get(databaseUrl);
  if (!client) {
    client = postgres(
      databaseUrl,
      postgresClientOptions({
        poolMax: env.DB_POOL_MAX,
        idleTimeoutSeconds: env.DB_IDLE_TIMEOUT,
        connectTimeoutSeconds: env.DB_CONNECT_TIMEOUT,
        statementTimeoutMs: env.DB_STATEMENT_TIMEOUT,
      }),
    );
    clients.set(databaseUrl, client);
  }
  const database = drizzle({ client, schema });
  repairPostgresJsSerializers(client);
  return database;
}

export type AppDatabase = ReturnType<typeof createDb>;

let database: AppDatabase | undefined;

export function getDb(): AppDatabase {
  database ??= createDb(getServerEnv().DATABASE_URL);
  return database;
}
