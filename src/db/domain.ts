export const SEX_VALUES = ["male", "female", "undisclosed"] as const;
export const GOAL_VALUES = [
  "hypertrophy",
  "strength",
  "fat_loss",
  "conditioning",
  "health",
] as const;
export const TRAINING_PLACE_VALUES = [
  "full_gym",
  "dumbbells",
  "home",
  "bodyweight",
] as const;
export const SESSION_MINUTE_VALUES = [30, 45, 60, 75, 90] as const;
export const CONSENT_PURPOSES = [
  "body_data",
  "coach_health",
  "analytics",
  "coach_chat",
] as const;
export const CONSENT_ACTIONS = ["granted", "revoked"] as const;
export const CONSENT_SOURCES = ["onboarding", "profile", "reconsent"] as const;
export const LEVEL_VALUES = ["beginner", "intermediate", "advanced"] as const;
export const MASS_UNIT_VALUES = ["kg", "lb"] as const;
export const THEME_VALUES = ["dark", "light", "system"] as const;
export const SESSION_STATUS_VALUES = ["in_progress", "completed"] as const;

export type Sex = (typeof SEX_VALUES)[number];
export type Goal = (typeof GOAL_VALUES)[number];
export type TrainingPlace = (typeof TRAINING_PLACE_VALUES)[number];
export type TrainingLevel = (typeof LEVEL_VALUES)[number];
export type ConsentPurpose = (typeof CONSENT_PURPOSES)[number];
export type ConsentAction = (typeof CONSENT_ACTIONS)[number];
export type ConsentSource = (typeof CONSENT_SOURCES)[number];
export type MassUnit = (typeof MASS_UNIT_VALUES)[number];
export type ThemePreference = (typeof THEME_VALUES)[number];
export type SessionStatus = (typeof SESSION_STATUS_VALUES)[number];
