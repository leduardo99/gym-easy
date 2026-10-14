import { redirect } from "next/navigation";

import { AuthFrame } from "@/components/auth/auth-frame";
import { SignupForm } from "@/components/auth/signup-form";
import { postAuthDestination } from "@/features/auth/destination";
import { lookupSession } from "@/features/auth/lookup-session";

export const instant = false;

export default async function SignupPage() {
  const session = await lookupSession();
  if (session.status === "ok") {
    redirect(postAuthDestination(session.user, null));
  }

  return (
    <AuthFrame title="Criar conta">
      <SignupForm />
    </AuthFrame>
  );
}
