import { AuthFrame } from "@/components/auth/auth-frame";

export default function ForgotPasswordPage() {
  return (
    <AuthFrame title="Recuperar senha" backHref="/login">
      <p className="text-sm text-muted-foreground">
        A recuperação de senha ainda não está disponível nesta versão.
      </p>
    </AuthFrame>
  );
}
