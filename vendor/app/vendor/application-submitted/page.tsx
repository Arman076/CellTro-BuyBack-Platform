import {
  CheckCircle2,
  Clock3,
  KeyRound,
  Mail,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import AuthShell from "@/components/auth/AuthShell";

import styles from "./ApplicationSubmitted.module.css";

export default function ApplicationSubmittedPage() {
  return (
    <AuthShell>
      <div className={styles.container}>
        <div className={styles.success}>
          <CheckCircle2 size={42} />
        </div>

        <h1>Application submitted!</h1>

        <p className={styles.subtitle}>
          Thank you for registering with Celltro.
        </p>

        <div className={styles.review}>
          <Clock3 size={24} />

          <div>
            <strong>
              Your application is under review
            </strong>

            <p>
              Our team will review your submitted
              details. Approval is required before
              vendor access is activated.
            </p>
          </div>
        </div>

        <h2>What happens next?</h2>

        <div className={styles.items}>
          <div>
            <ShieldCheck size={18} />
            Celltro reviews your application
          </div>

          <div>
            <Mail size={18} />
            You receive an approval email
          </div>

          <div>
            <KeyRound size={18} />
            Set your password securely
          </div>
        </div>

        <Link
          className={styles.login}
          href="/vendor/login"
        >
          Go to Vendor Login
        </Link>

        <p className={styles.tagline}>
          Sell Smart. Sell Easy.
        </p>
      </div>
    </AuthShell>
  );
}