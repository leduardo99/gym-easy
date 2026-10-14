import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getServerEnv } from "@/lib/env";

export function createDb(databaseUrl: string) {
  return drizzle({ client: neon(databaseUrl) });
}

let database: ReturnType<typeof createDb> | undefined;

export function getDb() {
  database ??= createDb(getServerEnv().DATABASE_URL);
  return database;
}
