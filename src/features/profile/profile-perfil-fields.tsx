import { ProfileBirthYearField } from "./profile-birth-year-field";
import type { ProfileFormValues } from "./profile-form-types";
import { ProfileOptionalCoachFields } from "./profile-optional-coach-fields";

export function ProfilePerfilFields({
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
      <ProfileOptionalCoachFields profile={values} />
    </>
  );
}
