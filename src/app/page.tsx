import Link from "next/link";
import { redirect } from "next/navigation";
import { Dumbbell } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { postAuthDestination } from "@/features/auth/destination";
import { lookupSession } from "@/features/auth/lookup-session";
import { isDesignCatalogEnabled } from "@/lib/design-catalog";
import { cn } from "@/lib/utils";

export const instant = false;

export default async function HomePage() {
  const session = await lookupSession();
  if (session.status === "ok") {
    redirect(postAuthDestination(session.user, null));
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-8 px-4 py-10 md:max-w-2xl">
      <div className="flex flex-col items-center gap-3 text-center">
        <Dumbbell aria-hidden="true" className="size-10 text-primary" />
        <h1 className="text-title-1 font-semibold">Gym Easy</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          Registre seus treinos e veja sua evolução.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Link
          href="/cadastro"
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          Criar conta
        </Link>
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "w-full",
          )}
        >
          Entrar
        </Link>
      </div>
      {isDesignCatalogEnabled() ? (
        <Link
          href="/design"
          className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Catálogo de design
        </Link>
      ) : null}
    </main>
  );
}
