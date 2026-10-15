import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProfileRecord } from "@/features/training/repository";

import { ProfileBirthYearField } from "./profile-birth-year-field";
import {
  goalOptions,
  levelOptions,
  PROFILE_FIELD_LABELS,
  sessionMinuteOptions,
  sexOptions,
  trainingPlaceOptions,
} from "./profile-copy";
import { ProfileHeightField } from "./profile-height-field";
import { ProfileSelect } from "./profile-select";

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

function formatDaysPerWeek(days: number | null | undefined): string {
  if (days == null) return "";
  return String(days);
}

export function ProfileTrainingFields({
  profile,
}: {
  profile: ProfileFormValues | null | undefined;
}) {
  const values = profile ?? {
    birthYear: null,
    sex: null,
    heightCm: null,
    goal: null,
    level: null,
    daysPerWeek: null,
    sessionMinutes: null,
    trainingPlace: null,
  };

  return (
    <>
      <ProfileBirthYearField birthYear={values.birthYear} />
      <ProfileSelect
        id="profile-sex"
        name="sex"
        label={PROFILE_FIELD_LABELS.sex}
        defaultValue={values.sex ?? ""}
        options={sexOptions()}
      />
      <ProfileHeightField heightCm={values.heightCm} />
      <ProfileSelect
        id="profile-goal"
        name="goal"
        label={PROFILE_FIELD_LABELS.goal}
        defaultValue={values.goal ?? ""}
        options={goalOptions()}
      />
      <ProfileSelect
        id="profile-level"
        name="level"
        label={PROFILE_FIELD_LABELS.level}
        defaultValue={values.level ?? ""}
        options={levelOptions()}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor="profile-days">{PROFILE_FIELD_LABELS.daysPerWeek}</Label>
        <Input
          id="profile-days"
          name="daysPerWeek"
          inputMode="numeric"
          autoComplete="off"
          placeholder="3"
          defaultValue={formatDaysPerWeek(values.daysPerWeek)}
        />
      </div>
      <ProfileSelect
        id="profile-session-minutes"
        name="sessionMinutes"
        label={PROFILE_FIELD_LABELS.sessionMinutes}
        defaultValue={
          values.sessionMinutes == null ? "" : String(values.sessionMinutes)
        }
        options={sessionMinuteOptions()}
      />
      <ProfileSelect
        id="profile-training-place"
        name="trainingPlace"
        label={PROFILE_FIELD_LABELS.trainingPlace}
        defaultValue={values.trainingPlace ?? ""}
        options={trainingPlaceOptions()}
      />
    </>
  );
}
