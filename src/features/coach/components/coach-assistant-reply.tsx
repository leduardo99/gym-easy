import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CoachAssistantReplyProps = {
  text: string;
  cta?: { href: string; label: string };
};

export function CoachAssistantReply({ text, cta }: CoachAssistantReplyProps) {
  return (
    <div
      className="rounded-xl bg-card px-4 py-3 text-sm ring-1 ring-foreground/10"
      role="status"
    >
      <p>{text}</p>
      {cta ? (
        <Link
          href={cta.href}
          className={cn(buttonVariants({ size: "lg" }), "mt-4 w-full")}
        >
          {cta.label}
        </Link>
      ) : null}
    </div>
  );
}
