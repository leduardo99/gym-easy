import Link from "next/link";

import { PRIVACY_POLICY } from "@/features/consent/privacy-policy";

export const instant = false;

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-4 py-10 md:max-w-2xl">
      <h1 className="text-title-1 font-semibold">Privacidade</h1>
      {PRIVACY_POLICY.paragraphs.map((paragraph) => (
        <p key={paragraph} className="text-sm leading-6 text-muted-foreground">
          {paragraph}
        </p>
      ))}
      <Link
        href="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Voltar
      </Link>
    </main>
  );
}
