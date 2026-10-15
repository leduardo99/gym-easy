/**
 * Paid ZDR requires coach_health and coach_chat grants on the -15c consent wave.
 * Text copy ships later in `src/consent/texts.ts`; this module only enforces ids.
 */
export const PAID_ZDR_CONSENT_VERSION_SUFFIX = "2026-10-15c";

export const PAID_ZDR_COACH_HEALTH_VERSION_ID = `coach_health-pt-BR-${PAID_ZDR_CONSENT_VERSION_SUFFIX}`;
export const PAID_ZDR_COACH_CHAT_VERSION_ID = `coach_chat-pt-BR-${PAID_ZDR_CONSENT_VERSION_SUFFIX}`;

export type CoachConsentVersions = {
  coachHealth: string | null;
  coachChat: string | null;
};

export function coachConsentVersionsMeetPaidZdr(
  versions: CoachConsentVersions,
  configuredSuffix: string | null,
): boolean {
  if (!configuredSuffix?.trim()) return false;
  if (configuredSuffix !== PAID_ZDR_CONSENT_VERSION_SUFFIX) return false;
  const suffix = `-${configuredSuffix}`;
  return (
    versions.coachHealth !== null &&
    versions.coachHealth.endsWith(suffix) &&
    versions.coachChat !== null &&
    versions.coachChat.endsWith(suffix)
  );
}
