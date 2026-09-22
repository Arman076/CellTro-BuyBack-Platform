import AuthShell from "@/components/auth/AuthShell";
import VerifyEmailForm from "@/components/auth/VerifyEmailForm";

export default function VerifyEmailPage() {
  return (
    <AuthShell>
      <VerifyEmailForm />
    </AuthShell>
  );
}