import { AppShell } from "@/components/app/bottom-nav";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/features/auth/actions";
import { requireUser } from "@/features/auth/require-user";

export const instant = false;

export default async function ProfilePage() {
  const user = await requireUser("/perfil");

  return (
    <AppShell>
      <h1 className="text-title-1 font-semibold">Perfil</h1>
      <p className="mt-4 font-medium">{user.name}</p>
      <p className="text-sm text-muted-foreground">{user.email}</p>
      <form action={logoutAction} className="mt-8">
        <Button type="submit" variant="outline" size="lg" className="w-full">
          Sair
        </Button>
      </form>
    </AppShell>
  );
}
