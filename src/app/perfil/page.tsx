import Link from "next/link";

import { AppShell } from "@/components/app/bottom-nav";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { logoutAction } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/require-user";
import { RECONSENT_COPY } from "@/features/consent/reconsent";
import { ProfileHeightField } from "@/features/profile/profile-height-field";
import { saveProfileAction } from "@/features/training/actions";
import { createTrainingRepository } from "@/features/training/repository";

export const instant = false;

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string; erro?: string }>;
}) {
  const user = await requireUser("/perfil");
  const profile = await createTrainingRepository(getDb()).getProfile(user.id);
  const params = await searchParams;
  const notice =
    params.guardado === "1"
      ? "Altura guardada."
      : params.erro === "altura"
        ? "Informe uma altura entre 100 e 250 cm."
        : params.erro === "origem"
          ? RECONSENT_COPY.origin
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
          <AlertDescription>{notice}</AlertDescription>
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
      <form action={saveProfileAction} className="mt-8 flex flex-col gap-4">
        <ProfileHeightField heightCm={profile?.heightCm} />
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
