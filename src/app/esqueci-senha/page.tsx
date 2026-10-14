import { AuthFrame } from "@/components/auth/auth-frame";
import { ResetRequestForm } from "@/components/auth/reset-request-form";

export default function ForgotPasswordPage() {
  return (
    <AuthFrame title="Recuperar senha" backHref="/login">
      <p className="mb-6 text-sm text-muted-foreground">
        Informe o email da conta. O link para escolher uma senha nova ainda não
        está disponível. Se o envio falhar, você pode tentar de novo.
      </p>
      <ResetRequestForm />
    </AuthFrame>
  );
}
