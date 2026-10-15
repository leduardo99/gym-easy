import { ProfileBirthYearField } from "./profile-birth-year-field";
import type { ProfileFormValues } from "./profile-form-types";
import { ProfileOptionalCoachFields } from "./profile-optional-coach-fields";

export function ProfilePerfilFields({
  profile,
  birthYearInvalid = false,
  birthYearErrorId,
  bodyDataGranted = true,
}: {
  profile: ProfileFormValues | null | undefined;
  birthYearInvalid?: boolean;
  birthYearErrorId?: string;
  bodyDataGranted?: boolean;
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
      <ProfileBirthYearField
        birthYear={values.birthYear}
        invalid={birthYearInvalid}
        errorMessageId={birthYearErrorId}
      />
      <ProfileOptionalCoachFields
        profile={values}
        bodyDataGranted={bodyDataGranted}
      />
    </>
  );
}
