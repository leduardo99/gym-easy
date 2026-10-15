import Link from "next/link";

import { AppShell } from "@/components/app/bottom-nav";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { CONSENT_TEXTS } from "@/consent/texts";
import { requireUser } from "@/features/auth/require-user";
import { ReconsentScreen } from "@/features/consent/reconsent-screen";
import {
  RECONSENT_COPY,
  RECONSENT_FALLBACK,
  parseReconsentNotice,
  parseReconsentScope,
  reconsentPath,
  safeReconsentNext,
} from "@/features/consent/reconsent";

export const instant = false;

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{
    scope?: string;
    next?: string;
    recusado?: string;
    erro?: string;
  }>;
}) {
  const params = await searchParams;
  const scope = parseReconsentScope(params.scope);
  const nextPath = safeReconsentNext(params.next);
  await requireUser(scope ? reconsentPath(scope, nextPath) : "/consentimento");

  if (!scope) {
    return (
      <AppShell>
        <PageHeader title="Autorização" description={RECONSENT_COPY.scope} />
        <Button asChild variant="outline" size="lg" className="mt-6 w-full">
          <Link href={RECONSENT_FALLBACK}>Voltar ao perfil</Link>
        </Button>
      </AppShell>
    );
  }

  const notice = parseReconsentNotice(params.recusado, params.erro);

  return (
    <ReconsentScreen
      copy={CONSENT_TEXTS[scope]}
      scope={scope}
      nextPath={nextPath}
      notice={notice}
    />
  );
}
