import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { PROFILE_FIELD_LABELS } from "./profile-copy";

const BIRTH_YEAR_HINT_ID = "birthYear-hint";

export function formatProfileBirthYear(
  birthYear: number | null | undefined,
): string {
  if (birthYear == null) return "";
  return String(birthYear);
}

export function ProfileBirthYearField({
  birthYear,
  required = false,
  invalid = false,
  errorMessageId,
}: {
  birthYear: number | null | undefined;
  required?: boolean;
  invalid?: boolean;
  errorMessageId?: string;
}) {
  const describedBy = [invalid && errorMessageId, BIRTH_YEAR_HINT_ID]
    .filter(Boolean)
    .join(" ");

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
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy || undefined}
        defaultValue={formatProfileBirthYear(birthYear)}
      />
      <p id={BIRTH_YEAR_HINT_ID} className="text-sm text-muted-foreground">
        Usamos o ano para calcular a faixa etária no coach. O Gym Easy é para
        maiores de 16 anos.
      </p>
    </div>
  );
}
