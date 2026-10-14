"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

export function PasswordField({
  id,
  name,
  autoComplete,
  invalid,
  describedBy,
  disabled,
  inputRef,
  value,
  onBlur,
  onChange,
}: {
  id: string;
  name: string;
  autoComplete: "new-password" | "current-password";
  invalid: boolean;
  describedBy?: string;
  disabled: boolean;
  inputRef: React.Ref<HTMLInputElement>;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const shown = visible && !disabled;

  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        name={name}
        ref={inputRef}
        type={shown ? "text" : "password"}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className="h-11"
      />
      <InputGroupAddon align="inline-end">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={shown ? "Ocultar senha" : "Mostrar senha"}
          aria-pressed={shown}
          disabled={disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setVisible((current) => !current)}
        >
          {shown ? <EyeOff /> : <Eye />}
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}
