import { AppShell } from "@/components/app/bottom-nav";
import { Button } from "@/components/ui/button";
import { skipOnboardingAction, logoutAction } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/require-user";

export const instant = false;

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");

  return (
    <AppShell>
      <h1 className="text-title-1 font-semibold">Sobre você</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Olá, {user.name}. O onboarding completo entra na próxima entrega.
      </p>
      <form action={skipOnboardingAction} className="mt-8">
        <Button type="submit" size="lg" className="w-full">
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
