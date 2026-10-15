import Link from "next/link";

import { AppShell } from "@/components/app/bottom-nav";
import { PageHeader } from "@/components/app/page-header";
import { CoachPrivacySection } from "@/features/coach/components/coach-privacy-section";
import { requireUser } from "@/features/auth/require-user";

export const instant = false;

export default async function ProfilePrivacyPage() {
  await requireUser("/perfil/privacidade");

  return (
    <AppShell>
      <PageHeader
        title="Privacidade"
        description="Autorizações e dados do Coach de IA na sua conta."
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
