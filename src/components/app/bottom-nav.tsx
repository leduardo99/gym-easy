"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, History, House, User } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/inicio", label: "Início", icon: House },
  { href: "/treinos", label: "Treinos", icon: Dumbbell },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/perfil", label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="sticky bottom-0 border-t bg-background"
    >
      <ul className="grid grid-cols-4">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-micro",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col md:max-w-2xl">
      <div className="flex flex-1 flex-col px-4 py-6">{children}</div>
      <BottomNav />
    </div>
  );
}
