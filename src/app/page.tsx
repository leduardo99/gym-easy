import Link from "next/link";

import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { isDesignCatalogEnabled } from "@/lib/design-catalog";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-8 px-4 py-10">
      <PageHeader
        title="Gym Easy"
        description="Registre treinos com rapidez, no celular."
      />
      <p className="max-w-prose text-label text-muted-foreground">
        Base técnica da V1. Login, treinos e o banco entram nas próximas
        entregas. Esta tela confirma que o app sobe sem uma conexão real.
      </p>
      {isDesignCatalogEnabled() ? (
        <Link href="/design" className={cn(buttonVariants())}>
          Catálogo de design
        </Link>
      ) : null}
    </main>
  );
}
