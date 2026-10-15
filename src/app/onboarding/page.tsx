import { AppShell } from "@/components/app/bottom-nav";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getDb } from "@/db";
import { skipOnboardingAction, logoutAction } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/require-user";
import { RECONSENT_COPY } from "@/features/consent/reconsent";
import { ProfileBirthYearField } from "@/features/profile/profile-birth-year-field";
import { saveOnboardingProfileAction } from "@/features/training/actions";
import { createTrainingRepository } from "@/features/training/repository";

export const instant = false;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string; erro?: string }>;
}) {
  const user = await requireUser("/onboarding");
  const profile = await createTrainingRepository(getDb()).getProfile(user.id);
  const params = await searchParams;
  const notice =
    params.erro === "nascimento"
      ? "Informe um ano de nascimento válido. O Gym Easy é para maiores de 16 anos."
      : params.erro === "perfil"
        ? "Revise os dados e tente de novo."
        : params.erro === "origem"
          ? RECONSENT_COPY.origin
          : null;

  return (
    <AppShell>
      <h1 className="text-title-1 font-semibold">Sobre você</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Olá, {user.name}. O ano de nascimento é necessário para usar o coach com
        segurança.
      </p>
      {notice ? (
        <Alert className="mt-6" variant="destructive">
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      <form
        action={saveOnboardingProfileAction}
        className="mt-8 flex flex-col gap-4"
      >
        <ProfileBirthYearField birthYear={profile?.birthYear} />
        <Button type="submit" size="lg" className="w-full">
          Guardar e continuar
        </Button>
      </form>
      <form action={skipOnboardingAction} className="mt-3">
        <Button type="submit" variant="outline" size="lg" className="w-full">
          Pular
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
