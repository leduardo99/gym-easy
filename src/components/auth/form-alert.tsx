import { CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

export function FormAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
