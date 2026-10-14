import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AuthFrame({
  title,
  backHref = "/",
  children,
}: {
  title: string;
  backHref?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 py-6 md:max-w-2xl md:justify-center">
      <div className="mb-8 flex items-center gap-2">
        <Link
          href={backHref}
          aria-label="Voltar"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <ChevronLeft />
        </Link>
        <h1 className="text-title-1 font-semibold">{title}</h1>
      </div>
      {children}
    </main>
  );
}
