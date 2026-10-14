"use client";

import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app/page-header";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const colors = [
  { name: "background", className: "bg-background" },
  { name: "foreground", className: "bg-foreground" },
  { name: "card", className: "bg-card" },
  { name: "primary", className: "bg-primary" },
  { name: "primary-soft", className: "bg-primary-soft" },
  { name: "secondary", className: "bg-secondary" },
  { name: "muted", className: "bg-muted" },
  { name: "accent", className: "bg-accent" },
  { name: "destructive", className: "bg-destructive" },
  { name: "success", className: "bg-success" },
  { name: "warning", className: "bg-warning" },
  { name: "border", className: "bg-border" },
  { name: "chart-1", className: "bg-chart-1" },
  { name: "chart-2", className: "bg-chart-2" },
  { name: "chart-3", className: "bg-chart-3" },
] as const;

const typeScale = [
  { name: "display", className: "text-display" },
  { name: "metric", className: "text-metric tabular" },
  { name: "title-1", className: "text-title-1" },
  { name: "title-2", className: "text-title-2" },
  { name: "label", className: "text-label" },
  { name: "caption", className: "text-caption" },
  { name: "micro", className: "text-micro" },
] as const;

const spacing = [
  { name: "4", className: "w-1" },
  { name: "8", className: "w-2" },
  { name: "16", className: "w-4" },
  { name: "24", className: "w-6" },
  { name: "32", className: "w-8" },
] as const;

export function DesignCatalog() {
  const [shifted, setShifted] = useState(false);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-8">
      <PageHeader
        title="Design System"
        description="Catálogo da v2. Some em produção."
        action={<ThemeToggle />}
      />

      <section className="flex flex-col gap-4" aria-labelledby="colors-heading">
        <h2 id="colors-heading" className="text-title-2 font-medium">
          Cores
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {colors.map((color) => (
            <div key={color.name} className="flex flex-col gap-2">
              <div
                className={cn(
                  "h-14 rounded-lg ring-1 ring-border",
                  color.className,
                )}
              />
              <span className="text-micro text-muted-foreground">
                {color.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-4" aria-labelledby="type-heading">
        <h2 id="type-heading" className="text-title-2 font-medium">
          Tipografia
        </h2>
        <div className="flex flex-col gap-3">
          {typeScale.map((item) => (
            <p key={item.name} className={item.className}>
              {item.name} — Gym Easy
            </p>
          ))}
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-4" aria-labelledby="space-heading">
        <h2 id="space-heading" className="text-title-2 font-medium">
          Espaçamento, raio e elevação
        </h2>
        <div className="flex items-end gap-3">
          {spacing.map((item) => (
            <div key={item.name} className="flex flex-col items-center gap-2">
              <div
                className={cn("h-4 rounded-sm bg-primary", item.className)}
              />
              <span className="text-micro text-muted-foreground">
                {item.name}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          {(
            ["rounded-sm", "rounded-md", "rounded-lg", "rounded-xl"] as const
          ).map((radius) => (
            <div
              key={radius}
              className={cn("size-16 bg-primary-soft", radius)}
            />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["shadow-elev-1", "shadow-elev-2", "shadow-elev-3"] as const).map(
            (elevation) => (
              <div
                key={elevation}
                className={cn(
                  "rounded-lg bg-card px-4 py-6 text-caption",
                  elevation,
                )}
              >
                {elevation}
              </div>
            ),
          )}
        </div>
      </section>

      <Separator />

      <section className="flex flex-col gap-4" aria-labelledby="motion-heading">
        <h2 id="motion-heading" className="text-title-2 font-medium">
          Motion
        </h2>
        <div className="flex h-16 items-center rounded-lg bg-muted px-4">
          <div
            className="size-8 rounded-md bg-primary"
            style={{
              transform: shifted ? "translateX(4rem)" : "translateX(0)",
              transitionProperty: "transform",
              transitionDuration: "var(--duration-base)",
              transitionTimingFunction: "var(--ease-standard)",
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setShifted((value) => !value);
          }}
        >
          Rodar motion
        </Button>
      </section>

      <Separator />

      <section
        className="flex flex-col gap-4"
        aria-labelledby="components-heading"
      >
        <h2 id="components-heading" className="text-title-2 font-medium">
          Componentes
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button">Default</Button>
          <Button type="button" variant="outline">
            Outline
          </Button>
          <Button type="button" variant="secondary">
            Secondary
          </Button>
          <Button type="button" variant="ghost">
            Ghost
          </Button>
          <Button type="button" variant="destructive">
            Destructive
          </Button>
          <Button type="button" size="lg">
            Large
          </Button>
          <Button type="button" disabled>
            Disabled
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Treino de hoje</CardTitle>
            <CardDescription>Card com os tokens de superfície.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-11 w-full" />
            <Button
              type="button"
              onClick={() => {
                toast.success("Treino salvo");
              }}
            >
              Mostrar toast
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
