import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getServerEnv } from "@/lib/env";

import { shouldUsePgDriver } from "./driver";
import * as schema from "./schema";

function createNeonDatabase(databaseUrl: string) {
  return drizzleNeon({ client: neon(databaseUrl), schema });
}

export type AppDatabase = ReturnType<typeof createNeonDatabase>;

const pools = new Map<string, Pool>();

export function createDb(databaseUrl: string): AppDatabase {
  if (shouldUsePgDriver(databaseUrl)) {
    let pool = pools.get(databaseUrl);
    if (!pool) {
      pool = new Pool({ connectionString: databaseUrl, max: 1 });
      pools.set(databaseUrl, pool);
    }
    return drizzlePg({ client: pool, schema }) as unknown as AppDatabase;
  }

  return createNeonDatabase(databaseUrl);
}

let database: AppDatabase | undefined;

export function getDb(): AppDatabase {
  database ??= createDb(getServerEnv().DATABASE_URL);
  return database;
}
