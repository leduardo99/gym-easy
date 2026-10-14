import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ConfirmPending } from "@/components/auth/confirm-pending";
import { postAuthDestination } from "@/features/auth/destination";
import { lookupSession } from "@/features/auth/lookup-session";
import { openConfirmEmail } from "@/features/auth/confirm-email-cookie";
import { CONFIRM_EMAIL_COOKIE_NAME } from "@/features/auth/session-cookie";
import { getServerEnv } from "@/lib/env";

export const instant = false;

export default async function ConfirmPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ fresh?: string; status?: string; delivery?: string }>;
}) {
  const session = await lookupSession();
  if (session.status === "ok") {
    redirect(postAuthDestination(session.user, null));
  }

  const params = await searchParams;
  const jar = await cookies();
  const email = openConfirmEmail(
    jar.get(CONFIRM_EMAIL_COOKIE_NAME)?.value ?? "",
    getServerEnv().CONFIRM_EMAIL_SECRET,
  );
  return (
    <ConfirmPending
      email={email}
      fresh={params.fresh === "1"}
      expired={params.status === "expired"}
      deliveryFailed={params.delivery === "failed"}
    />
  );
}
