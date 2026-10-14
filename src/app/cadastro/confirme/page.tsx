import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ConfirmPending } from "@/components/auth/confirm-pending";
import { postAuthDestination } from "@/features/auth/destination";
import { lookupSession } from "@/features/auth/lookup-session";
import { emailSchema } from "@/features/auth/schemas";
import { CONFIRM_EMAIL_COOKIE_NAME } from "@/features/auth/session-cookie";

export const instant = false;

export default async function ConfirmPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ fresh?: string; status?: string }>;
}) {
  const session = await lookupSession();
  if (session.status === "ok") {
    redirect(postAuthDestination(session.user, null));
  }

  const params = await searchParams;
  const jar = await cookies();
  const parsed = emailSchema.safeParse(
    jar.get(CONFIRM_EMAIL_COOKIE_NAME)?.value ?? "",
  );
  return (
    <ConfirmPending
      email={parsed.success ? parsed.data : null}
      fresh={params.fresh === "1"}
      expired={params.status === "expired"}
    />
  );
}
