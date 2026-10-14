import { CircleAlert } from "lucide-react";

import { FieldError } from "@/components/ui/field";

export function FieldMessage({
  id,
  message,
}: {
  id: string;
  message: string | undefined;
}) {
  if (!message) return null;
  return (
    <FieldError id={id}>
      <span className="flex items-start gap-1.5">
        <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
        {message}
      </span>
    </FieldError>
  );
}
