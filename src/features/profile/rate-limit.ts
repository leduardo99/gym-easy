import { sha256 } from "@/features/auth/tokens";

export const PROFILE_SAVE_LIMIT = 30;
export const PROFILE_SAVE_WINDOW_MS = 60_000;

export function profileSaveBucket(userId: string): string {
  return `profile-save:${sha256(userId)}`;
}
