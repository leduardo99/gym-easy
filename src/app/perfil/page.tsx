import Link from "next/link";

import { AppShell } from "@/components/app/bottom-nav";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { logoutAction } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/require-user";
import { RECONSENT_COPY } from "@/features/consent/reconsent";
import {
  PROFILE_BIRTH_YEAR_ERROR_MESSAGE,
  PROFILE_SAVE_RATE_LIMIT_MESSAGE,
} from "@/features/profile/profile-copy";
import { ProfileBirthYearFocus } from "@/features/profile/profile-birth-year-focus";
import { ProfileHeightField } from "@/features/profile/profile-height-field";
import { ProfilePerfilFields } from "@/features/profile/profile-perfil-fields";
import { createConsentRepository } from "@/features/consent/repository";
import { saveProfileAction } from "@/features/training/actions";
import { createTrainingRepository } from "@/features/training/repository";

export const instant = false;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string; erro?: string }>;
}) {
  const user = await requireUser("/perfil");
  const db = getDb();
  const profile = await createTrainingRepository(db).getProfile(user.id);
  const consents = await createConsentRepository(db).currentConsent(user.id);
  const bodyDataGranted = Boolean(consents.body_data);
  const params = await searchParams;
  const notice =
    params.guardado === "1"
      ? "Perfil guardado."
      : params.erro === "altura"
        ? "Informe uma altura entre 100 e 250 cm."
        : params.erro === "nascimento"
          ? PROFILE_BIRTH_YEAR_ERROR_MESSAGE
          : params.erro === "perfil"
            ? "Revise os dados do perfil e tente de novo."
            : params.erro === "origem"
              ? RECONSENT_COPY.origin
              : params.erro === "limite"
                ? PROFILE_SAVE_RATE_LIMIT_MESSAGE
                : null;

  return (
    <AppShell>
      <PageHeader title="Perfil" />
      <p className="mt-4 font-medium">{user.name}</p>
      <p className="text-sm text-muted-foreground">{user.email}</p>
      {notice ? (
        <Alert
          className="mt-6"
          variant={params.guardado === "1" ? "default" : "destructive"}
        >
          <AlertDescription
            id={params.erro === "nascimento" ? "birthYear-error" : undefined}
          >
            {notice}
          </AlertDescription>
        </Alert>
      ) : null}
      <nav aria-label="Definições do perfil" className="mt-8">
        <Link
          href="/perfil/privacidade"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Privacidade
        </Link>
      </nav>
      <ProfileBirthYearFocus />
      <form action={saveProfileAction} className="mt-8 flex flex-col gap-4">
        <ProfileHeightField
          heightCm={profile?.heightCm}
          disabled={!bodyDataGranted}
        />
        <ProfilePerfilFields
          profile={profile}
          bodyDataGranted={bodyDataGranted}
          birthYearInvalid={params.erro === "nascimento"}
          birthYearErrorId={
            params.erro === "nascimento" ? "birthYear-error" : undefined
          }
        />
        <Button type="submit" size="lg" className="w-full">
          Guardar
        </Button>
      </form>
      <form action={logoutAction} className="mt-3">
        <Button type="submit" variant="outline" size="lg" className="w-full">
          Sair
        </Button>
      </form>
    </AppShell>
  );
}
