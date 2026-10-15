import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { PROFILE_FIELD_LABELS } from "./profile-copy";

export function formatProfileBirthYear(
  birthYear: number | null | undefined,
): string {
  if (birthYear == null) return "";
  return String(birthYear);
}

export function ProfileBirthYearField({
  birthYear,
}: {
  birthYear: number | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="profile-birth-year">
        {PROFILE_FIELD_LABELS.birthYear}
      </Label>
      <Input
        id="profile-birth-year"
        name="birthYear"
        inputMode="numeric"
        autoComplete="bday-year"
        placeholder="1990"
        defaultValue={formatProfileBirthYear(birthYear)}
      />
      <p className="text-sm text-muted-foreground">
        Usamos o ano para calcular a faixa etária no coach. O Gym Easy é para
        maiores de 16 anos.
      </p>
    </div>
  );
}
