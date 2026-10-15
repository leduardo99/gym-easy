import { PageHeader } from "@/components/app/page-header";
import { AppShell } from "@/components/app/bottom-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ConsentCopy } from "@/consent/texts";

import { ReconsentConsentForm } from "./reconsent-consent-form";
import { RECONSENT_COPY, type ReconsentScope } from "./reconsent";

export function ReconsentScreen({
  copy,
  scope,
  nextPath,
  notice,
}: {
  copy: ConsentCopy;
  scope: ReconsentScope;
  nextPath: string;
  notice: "refused" | "checkbox" | "origin" | null;
}) {
  const noticeText =
    notice === "refused"
      ? RECONSENT_COPY.refused
      : notice === "checkbox"
        ? RECONSENT_COPY.checkbox
        : notice === "origin"
          ? RECONSENT_COPY.origin
          : null;

  return (
    <AppShell>
      <PageHeader title={copy.title} description={RECONSENT_COPY.intro} />
      {noticeText ? (
        <Alert
          className="mt-4"
          variant={notice === "refused" ? "default" : "destructive"}
        >
          <AlertDescription>{noticeText}</AlertDescription>
        </Alert>
      ) : null}
      <ReconsentConsentForm copy={copy} scope={scope} nextPath={nextPath} />
    </AppShell>
  );
}
