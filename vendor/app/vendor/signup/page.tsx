import AuthShell from "@/components/auth/AuthShell";
import VendorSignupForm from "@/components/auth/VendorSignupForm";

export default function VendorSignupPage() {
  return (
    <AuthShell>
      <VendorSignupForm />
    </AuthShell>
  );
}