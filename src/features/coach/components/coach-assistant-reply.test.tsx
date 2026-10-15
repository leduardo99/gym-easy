import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { PROFILE_INCOMPLETE_CTA } from "@/lib/ai/copy";

import { CoachAssistantReply } from "./coach-assistant-reply";

afterEach(() => {
  cleanup();
});

describe("CoachAssistantReply", () => {
  it("mostra CTA para completar o ano de nascimento", () => {
    render(
      <CoachAssistantReply
        text="Falta o ano de nascimento."
        cta={PROFILE_INCOMPLETE_CTA}
      />,
    );

    const link = screen.getByRole("link", {
      name: PROFILE_INCOMPLETE_CTA.label,
    });
    expect(link).toHaveAttribute("href", "/perfil#birthYear");
  });
});
