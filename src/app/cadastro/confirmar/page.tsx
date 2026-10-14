import { ConfirmToken } from "@/components/auth/confirm-token";

export const instant = false;

export default async function ConfirmTokenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <ConfirmToken token={params.token ?? ""} />;
}
