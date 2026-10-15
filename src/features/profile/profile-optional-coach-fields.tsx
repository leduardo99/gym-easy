import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  goalOptions,
  levelOptions,
  PROFILE_COACH_OPTIONAL_HINT,
  PROFILE_FIELD_LABELS,
  sessionMinuteOptions,
  sexOptions,
  trainingPlaceOptions,
} from "./profile-copy";
import { ProfileHeightField } from "./profile-height-field";
import { ProfileSelect } from "./profile-select";
import type { ProfileFormValues } from "./profile-form-types";

function formatDaysPerWeek(days: number | null | undefined): string {
  if (days == null) return "";
  return String(days);
}

export function ProfileOptionalCoachFields({
  profile,
}: {
  profile: Omit<ProfileFormValues, "birthYear"> | null | undefined;
}) {
  const values = profile ?? {
    sex: null,
    heightCm: null,
    goal: null,
    level: null,
    daysPerWeek: null,
    sessionMinutes: null,
    trainingPlace: null,
  };

  return (
    <fieldset className="flex flex-col gap-4 border-0 p-0">
      <legend className="text-sm font-medium">Treino e corpo</legend>
      <p className="text-sm text-muted-foreground">
        {PROFILE_COACH_OPTIONAL_HINT}
      </p>
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
    </fieldset>
  );
}
