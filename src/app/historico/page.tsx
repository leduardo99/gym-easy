import { AppShell } from "@/components/app/bottom-nav";
import { requireUser } from "@/features/auth/require-user";

export const instant = false;

export default async function HistoryPage() {
  await requireUser("/historico");

  return (
    <AppShell>
      <h1 className="text-title-1 font-semibold">Histórico</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Seus treinos aparecerão aqui
      </p>
    </AppShell>
  );
}
