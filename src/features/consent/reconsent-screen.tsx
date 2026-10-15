import { PageHeader } from "@/components/app/page-header";
import { AppShell } from "@/components/app/bottom-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { ConsentCopy } from "@/consent/texts";

import { ReconsentConsentForm } from "./reconsent-consent-form";
import {
  RECONSENT_COPY,
  type ReconsentNotice,
  type ReconsentScope,
  reconsentNoticeMessage,
} from "./reconsent";

export function ReconsentScreen({
  copy,
  scope,
  nextPath,
  notice,
}: {
  copy: ConsentCopy;
  scope: ReconsentScope;
  nextPath: string;
  notice: ReconsentNotice | null;
}) {
  const noticeText = notice ? reconsentNoticeMessage(notice) : null;

  return (
    <AppShell>
      <PageHeader title={copy.title} description={RECONSENT_COPY.intro} />
      {noticeText ? (
        <Alert
          className="mt-4"
          variant={
            notice === "checkbox" || notice === "origin"
              ? "destructive"
              : "default"
          }
          data-testid="reconsent-notice"
        >
          <AlertDescription>{noticeText}</AlertDescription>
        </Alert>
      ) : null}
      <ReconsentConsentForm copy={copy} scope={scope} nextPath={nextPath} />
    </AppShell>
  );
}
