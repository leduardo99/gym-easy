import type { Sql } from "postgres";

/** OIDs whose postgres.js serializers must return text, not a Date. */
const DATE_OIDS = ["1082", "1083", "1114", "1182", "1184", "1185"] as const;

/**
 * Drizzle replaces these serializers with an identity function. postgres.js
 * then refuses a Date in the bind message, so timestamps are sent as text.
 */
export function repairPostgresJsSerializers(client: Sql): void {
  const serializers = client.options.serializers;
  for (const oid of DATE_OIDS) {
    serializers[oid] = (value: unknown) => {
      if (value instanceof Date) return value.toISOString();
      if (value == null) return "";
      return String(value);
    };
  }
}
