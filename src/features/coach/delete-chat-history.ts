import type { AppDatabase } from "@/db";
import { deleteCoachChatHistory } from "@/lib/ai/messages";

export async function deleteUserCoachChatHistory(
  db: AppDatabase,
  userId: string,
): Promise<number> {
  return deleteCoachChatHistory(db, userId);
}
