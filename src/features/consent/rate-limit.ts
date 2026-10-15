export const BODY_DATA_PRIVACY_LIMIT = 10;
export const BODY_DATA_PRIVACY_WINDOW_MS = 60_000;

export function bodyDataPrivacyBucket(userId: string): string {
  return `body-data-privacy:${userId}`;
}
