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
  required = false,
}: {
  birthYear: number | null | undefined;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="birthYear">{PROFILE_FIELD_LABELS.birthYear}</Label>
      <Input
        id="birthYear"
        name="birthYear"
        inputMode="numeric"
        autoComplete="bday-year"
        placeholder="1990"
        required={required}
        defaultValue={formatProfileBirthYear(birthYear)}
      />
      <p className="text-sm text-muted-foreground">
        Usamos o ano para calcular a faixa etária no coach. O Gym Easy é para
        maiores de 16 anos.
      </p>
    </div>
  );
}
