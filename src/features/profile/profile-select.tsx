import { cn } from "@/lib/utils";

import { Label } from "@/components/ui/label";

import { PROFILE_FORM_EMPTY_OPTION } from "./profile-copy";

const selectClassName =
  "h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30";

export function ProfileSelect({
  id,
  name,
  label,
  defaultValue,
  options,
}: {
  id: string;
  name: string;
  label: string;
  defaultValue: string;
  options: ReadonlyArray<{ value: string; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className={cn(selectClassName)}
      >
        <option value="">{PROFILE_FORM_EMPTY_OPTION}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
