import Link from "next/link";

import {
  PRIVACY_POLICY,
  PRIVACY_POLICY_BIRTH_YEAR_MINIMUM_AGE_ID,
  PRIVACY_POLICY_MINIMUM_AGE_ID,
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
        aria-labelledby={PRIVACY_POLICY.profileBodyData.id}
        role="region"
        className="flex flex-col gap-3"
      >
        <h2
          id={PRIVACY_POLICY.profileBodyData.id}
          className="text-title-2 font-semibold"
        >
          {PRIVACY_POLICY.profileBodyData.heading}
        </h2>
        <div className="flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold">
              {PRIVACY_POLICY.profileBodyData.contractualProfile.heading} (
              {PRIVACY_POLICY.profileBodyData.contractualProfile.basis})
            </h3>
            <ul className="mt-1 list-disc pl-5 text-sm leading-6 text-muted-foreground">
              {PRIVACY_POLICY.profileBodyData.contractualProfile.fields.map(
                (field) => (
                  <li key={field}>{field}</li>
                ),
              )}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">
              {PRIVACY_POLICY.profileBodyData.bodyDataConsent.heading} (
              {PRIVACY_POLICY.profileBodyData.bodyDataConsent.basis})
            </h3>
            <ul className="mt-1 list-disc pl-5 text-sm leading-6 text-muted-foreground">
              {PRIVACY_POLICY.profileBodyData.bodyDataConsent.fields.map(
                (field) => (
                  <li key={field}>{field}</li>
                ),
              )}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold">
              {PRIVACY_POLICY.profileBodyData.retainedAfterRevoke.heading} (
              {PRIVACY_POLICY.profileBodyData.retainedAfterRevoke.basis})
            </h3>
            <ul className="mt-1 list-disc pl-5 text-sm leading-6 text-muted-foreground">
              {PRIVACY_POLICY.profileBodyData.retainedAfterRevoke.fields.map(
                (field) => (
                  <li key={field}>{field}</li>
                ),
              )}
            </ul>
          </div>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          {PRIVACY_POLICY.profileBodyData.paragraphs.intro}
        </p>
        <p
          id={PRIVACY_POLICY_MINIMUM_AGE_ID}
          className="text-sm leading-6 text-muted-foreground"
        >
          {PRIVACY_POLICY.profileBodyData.paragraphs.minimumAge}
        </p>
        <p
          id={PRIVACY_POLICY_BIRTH_YEAR_MINIMUM_AGE_ID}
          className="text-sm leading-6 text-muted-foreground"
        >
          {PRIVACY_POLICY.profileBodyData.paragraphs.revoke}
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          {PRIVACY_POLICY.profileBodyData.paragraphs.coachHealth}
        </p>
        <p className="text-sm leading-6 text-muted-foreground">
          {PRIVACY_POLICY.profileBodyData.paragraphs.aiLogs}
        </p>
      </section>
      <section
        aria-labelledby={PRIVACY_POLICY.rights.id}
        role="region"
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
