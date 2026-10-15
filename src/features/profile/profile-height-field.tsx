import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function formatProfileHeightCm(
  heightCm: number | null | undefined,
): string {
  if (heightCm == null) return "";
  return String(heightCm);
}

export function ProfileHeightField({
  heightCm,
  disabled = false,
}: {
  heightCm: number | null | undefined;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="profile-height">Altura (cm)</Label>
      <Input
        id="profile-height"
        name={disabled ? undefined : "heightCm"}
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        defaultValue={formatProfileHeightCm(heightCm)}
      />
      {disabled ? (
        <p className="text-sm text-muted-foreground">
          Ative «Dados do corpo» em Privacidade para guardar altura.
        </p>
      ) : null}
    </div>
  );
}
