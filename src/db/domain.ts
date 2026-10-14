export const SEX_VALUES = ["male", "female", "undisclosed"] as const;
export const GOAL_VALUES = [
  "hypertrophy",
  "strength",
  "fat_loss",
  "conditioning",
] as const;
export const LEVEL_VALUES = ["beginner", "intermediate", "advanced"] as const;
export const MASS_UNIT_VALUES = ["kg", "lb"] as const;
export const THEME_VALUES = ["dark", "light", "system"] as const;
export const SESSION_STATUS_VALUES = ["in_progress", "completed"] as const;

export type Sex = (typeof SEX_VALUES)[number];
export type Goal = (typeof GOAL_VALUES)[number];
export type TrainingLevel = (typeof LEVEL_VALUES)[number];
export type MassUnit = (typeof MASS_UNIT_VALUES)[number];
export type ThemePreference = (typeof THEME_VALUES)[number];
export type SessionStatus = (typeof SESSION_STATUS_VALUES)[number];
