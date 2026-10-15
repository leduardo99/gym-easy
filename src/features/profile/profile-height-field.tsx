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
}: {
  heightCm: number | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="profile-height">Altura (cm)</Label>
      <Input
        id="profile-height"
        name="heightCm"
        inputMode="numeric"
        autoComplete="off"
        defaultValue={formatProfileHeightCm(heightCm)}
      />
    </div>
  );
}
