import { AppShell } from "@/components/app/bottom-nav";
import { CoachChatPanel } from "@/features/coach/components/coach-chat-panel";
import { requireUser } from "@/features/auth/require-user";

export const instant = false;

export default async function WorkoutsPage() {
  await requireUser("/treinos");

  return (
    <AppShell>
      <h1 className="text-title-1 font-semibold">Treinos</h1>
      <p className="mt-4 text-sm text-muted-foreground">Nenhum treino ainda</p>
      <CoachChatPanel />
    </AppShell>
  );
}
