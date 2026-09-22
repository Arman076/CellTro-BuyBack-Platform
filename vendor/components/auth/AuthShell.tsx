import {
  BadgeCheck,
  Headphones,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import type { ReactNode } from "react";

import styles from "./AuthShell.module.css";

interface AuthShellProps {
  children: ReactNode;
}

export default function AuthShell({
  children,
}: AuthShellProps) {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <aside className={styles.brandPanel}>
          <div>
            <div className={styles.logo}>
              <span>C</span>
              CELLTRO
            </div>

            <p className={styles.kicker}>
              Partner with us
            </p>

            <h1>
              Grow together
              <br />
              with Celltro
            </h1>

            <p className={styles.description}>
              Join our network of trusted vendors
              and help build a smarter device
              buyback experience.
            </p>

            <ul>
              <li>
                <ShieldCheck size={18} />
                Secure registration
              </li>
              <li>
                <BadgeCheck size={18} />
                Verified vendor network
              </li>
              <li>
                <Headphones size={18} />
                Dedicated support
              </li>
              <li>
                <TrendingUp size={18} />
                Grow your business
              </li>
            </ul>
          </div>

          <div className={styles.tagline}>
            Sell Smart. Sell Easy.
          </div>
        </aside>

        <section className={styles.content}>
          {children}
        </section>
      </section>
    </main>
  );
}