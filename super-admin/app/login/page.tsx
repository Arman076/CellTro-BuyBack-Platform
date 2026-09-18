import type { Metadata } from "next";

import {
  BarChart3,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import LoginForm from "@/components/auth/LoginForm";

import styles from "./login.module.css";

export const metadata: Metadata = {
  title: "Login",
};

export default function LoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.brandSection}>
        <div className={styles.brandContent}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <Smartphone size={26} />
            </div>

            <div>
              <strong>CELLTRO</strong>
              <span>SUPER ADMIN</span>
            </div>
          </div>

          <div className={styles.heroContent}>
            <div className={styles.secureBadge}>
              <ShieldCheck size={16} />

              Secure Administration Portal
            </div>

            <h1>
              Control your complete
              <span> buyback platform.</span>
            </h1>

            <p>
              Manage orders, enquiries, vendors,
              agents, pricing and platform
              operations from one secure dashboard.
            </p>

            <div className={styles.features}>
              <Feature
                icon={<BarChart3 size={19} />}
                title="Business Analytics"
                description="Monitor enquiries, conversions and order performance."
              />

              <Feature
                icon={<CheckCircle2 size={19} />}
                title="Complete Operations"
                description="Control vendors, agents, routing and approvals."
              />

              <Feature
                icon={<LockKeyhole size={19} />}
                title="Secure Access"
                description="Role-based and audited platform administration."
              />
            </div>
          </div>

          <div className={styles.brandFooter}>
            <span>
              © 2026 Celltro
            </span>

            <span>
              Control Center
            </span>
          </div>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.mobileBrand}>
          <div className={styles.logoIcon}>
            <Smartphone size={22} />
          </div>

          <div>
            <strong>CELLTRO</strong>
            <span>SUPER ADMIN</span>
          </div>
        </div>

        <div className={styles.formContainer}>
          <div className={styles.formHeading}>
            <p className={styles.eyebrow}>
              WELCOME BACK
            </p>

            <h2>
              Sign in to Super Admin
            </h2>

            <p>
              Enter your authorized credentials
              to continue.
            </p>
          </div>

          <LoginForm />

          <div className={styles.securityNotice}>
            <ShieldCheck size={16} />

            <span>
              This portal is restricted to
              authorized Celltro administrators.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.feature}>
      <div className={styles.featureIcon}>
        {icon}
      </div>

      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}