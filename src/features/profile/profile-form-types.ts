import type { ProfileRecord } from "@/features/training/repository";

export type ProfileFormValues = Pick<
  ProfileRecord,
  | "birthYear"
  | "sex"
  | "heightCm"
  | "goal"
  | "level"
  | "daysPerWeek"
  | "sessionMinutes"
  | "trainingPlace"
>;
