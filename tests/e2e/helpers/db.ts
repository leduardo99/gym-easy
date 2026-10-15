import postgres from "postgres";

function databaseUrl(): string | null {
  const url = process.env.DATABASE_URL ?? "";
  return url.length > 0 ? url : null;
}

async function withDb<T>(
  work: (sql: postgres.Sql) => Promise<T>,
): Promise<T | null> {
  const url = databaseUrl();
  if (!url) return null;
  const sql = postgres(url, { max: 1 });
  try {
    return await work(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function countCoachMessagesForEmail(
  email: string,
): Promise<number> {
  const count = await withDb(async (sql) => {
    const rows = await sql<{ count: number }[]>`
      select count(*)::int as count
      from coach_messages m
      inner join users u on u.id = m.user_id
      where u.email = ${email}
    `;
    return rows[0]?.count ?? 0;
  });
  return count ?? 0;
}

export async function insertCoachMessageForEmail(
  email: string,
  content: string,
): Promise<void> {
  const inserted = await withDb(async (sql) => {
    const users = await sql<{ id: string }[]>`
      select id from users where email = ${email} limit 1
    `;
    const userId = users[0]?.id;
    if (!userId) throw new Error("user_not_found");
    await sql`
      insert into coach_messages (user_id, role, content, risk)
      values (${userId}::uuid, 'user', ${content}, 'none')
    `;
    return true;
  });
  if (!inserted) throw new Error("database_unavailable");
}
