import Link from "next/link";

import { AppShell } from "@/components/app/bottom-nav";
import { buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/features/auth/require-user";
import { cn } from "@/lib/utils";

export const instant = false;

export default async function HomeAppPage() {
  const user = await requireUser("/inicio");
  const today = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date());

  return (
    <AppShell>
      <h1 className="text-title-1 font-semibold">Olá, {user.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground capitalize">{today}</p>
      {user.onboardingCompletedAt ? null : (
        <Link
          href="/onboarding"
          className="mt-6 rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10"
        >
          Complete seu perfil
        </Link>
      )}
      <section className="mt-8 flex flex-1 flex-col items-start gap-3">
        <h2 className="text-title-2 font-semibold">Crie seu primeiro treino</h2>
        <p className="text-sm text-muted-foreground">
          Seus treinos vão aparecer aqui.
        </p>
        <Link href="/treinos" className={cn(buttonVariants({ size: "lg" }))}>
          Criar treino
        </Link>
      </section>
    </AppShell>
  );
}
