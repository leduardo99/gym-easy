import Link from "next/link";

import {
  PRIVACY_POLICY,
  processorText,
} from "@/features/consent/privacy-policy";

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
      <section
        aria-labelledby={PRIVACY_POLICY.rights.id}
        className="flex flex-col gap-3"
      >
        <h2
          id={PRIVACY_POLICY.rights.id}
          className="text-title-2 font-semibold"
        >
          {PRIVACY_POLICY.rights.heading}
        </h2>
        {PRIVACY_POLICY.rights.paragraphs.map((paragraph) => (
          <p
            key={paragraph}
            className="text-sm leading-6 text-muted-foreground"
          >
            {paragraph}
          </p>
        ))}
      </section>
      <section
        aria-labelledby={PRIVACY_POLICY.dataLocation.id}
        className="flex flex-col gap-3"
      >
        <h2
          id={PRIVACY_POLICY.dataLocation.id}
          className="text-title-2 font-semibold"
        >
          {PRIVACY_POLICY.dataLocation.heading}
        </h2>
        {PRIVACY_POLICY.dataLocation.paragraphs.map((paragraph) => (
          <p
            key={paragraph}
            className="text-sm leading-6 text-muted-foreground"
          >
            {paragraph}
          </p>
        ))}
      </section>
      <section
        aria-labelledby={PRIVACY_POLICY.processorsId}
        className="flex flex-col gap-3"
      >
        <h2
          id={PRIVACY_POLICY.processorsId}
          className="text-title-2 font-semibold"
        >
          {PRIVACY_POLICY.processorsHeading}
        </h2>
        <ul className="list-disc pl-5 text-sm leading-6 text-muted-foreground">
          {PRIVACY_POLICY.processors.map((processor) => (
            <li key={processor.name}>{processorText(processor)}</li>
          ))}
        </ul>
      </section>
      <Link
        href="/"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Voltar
      </Link>
    </main>
  );
}
