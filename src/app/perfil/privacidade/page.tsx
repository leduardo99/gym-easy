import Link from "next/link";

import { AppShell } from "@/components/app/bottom-nav";
import { PageHeader } from "@/components/app/page-header";
import { getDb } from "@/db";
import { CoachPrivacySection } from "@/features/coach/components/coach-privacy-section";
import { requireUser } from "@/features/auth/require-user";
import { BodyDataPrivacySection } from "@/features/consent/components/body-data-privacy-section";
import { createConsentRepository } from "@/features/consent/repository";
import { reconsentPath } from "@/features/consent/reconsent";

export const instant = false;

export default async function ProfilePrivacyPage() {
  const user = await requireUser("/perfil/privacidade");
  const consents = await createConsentRepository(getDb()).currentConsent(
    user.id,
  );
  const grantHref = reconsentPath("body_data", "/perfil/privacidade");

  return (
    <AppShell>
      <PageHeader
        title="Privacidade"
        description="Autorizações de dados do corpo e do Coach de IA na sua conta."
      />
      <BodyDataPrivacySection
        bodyDataGranted={Boolean(consents.body_data)}
        grantHref={grantHref}
      />
      <CoachPrivacySection />
      <Link
        href="/perfil"
        className="mt-8 inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Voltar ao perfil
      </Link>
    </AppShell>
  );
}
