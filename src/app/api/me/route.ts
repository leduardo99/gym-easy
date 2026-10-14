import { lookupSession } from "@/features/auth/lookup-session";

export async function GET() {
  const session = await lookupSession();
  if (session.status !== "ok") {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  return Response.json({
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  });
}
