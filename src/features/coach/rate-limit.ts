import { sha256 } from "@/features/auth/tokens";

export const COACH_PRIVACY_LIMIT = 10;
export const COACH_PRIVACY_WINDOW_MS = 60_000;

export function coachPrivacyBucket(userId: string): string {
  return `coach-privacy:${sha256(userId)}`;
}
