import { redirect } from "next/navigation";

import { AuthFrame } from "@/components/auth/auth-frame";
import { LoginForm } from "@/components/auth/login-form";
import { copy } from "@/features/auth/copy";
import {
  isAllowedNext,
  postAuthDestination,
} from "@/features/auth/destination";
import { lookupSession } from "@/features/auth/lookup-session";

export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; aviso?: string }>;
}) {
  const session = await lookupSession();
  if (session.status === "ok") {
    redirect(postAuthDestination(session.user, null));
  }

  const params = await searchParams;
  const nextPath =
    params.next && isAllowedNext(params.next) ? params.next : null;

  return (
    <AuthFrame title="Entrar">
      <LoginForm
        nextPath={nextPath}
        initialMessage={params.aviso === "sessao" ? copy.sessionExpired : null}
      />
    </AuthFrame>
  );
}
