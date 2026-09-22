"use client";

import {
  ArrowRight,
  ClipboardList,
  PackageCheck,
  Users,
  WalletCards,
  Clock3,
  ShieldCheck,
} from "lucide-react";

import Link from "next/link";

import styles from "./DashboardClient.module.css";

const quickActions = [
  {
    title: "Orders",
    description:
      "View and manage assigned orders.",
    href: "/vendor/orders",
    icon: ClipboardList,
  },
  {
    title: "Pickups",
    description:
      "Track scheduled and active pickups.",
    href: "/vendor/pickups",
    icon: PackageCheck,
  },
  {
    title: "Agents",
    description:
      "Manage your pickup agents.",
    href: "/vendor/agents",
    icon: Users,
  },
  {
    title: "Wallet",
    description:
      "View wallet and transaction activity.",
    href: "/vendor/wallet",
    icon: WalletCards,
  },
];

export default function DashboardClient() {
  return (
    <div className={styles.dashboard}>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            CELLTRO VENDOR WORKSPACE
          </span>

          <h1>
            Welcome to your vendor dashboard
          </h1>

          <p>
            Manage orders, pickups,
            agents and account activity
            from one workspace.
          </p>
        </div>

        <div className={styles.secureBadge}>
          <ShieldCheck size={20} />

          <div>
            <strong>
              Secure session
            </strong>

            <span>
              Vendor access verified
            </span>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>
              Quick access
            </h2>

            <p>
              Jump directly to your
              daily operations.
            </p>
          </div>
        </div>

        <div className={styles.quickGrid}>
          {quickActions.map(
            ({
              title,
              description,
              href,
              icon: Icon,
            }) => (
              <Link
                key={href}
                href={href}
                className={
                  styles.quickCard
                }
              >
                <div
                  className={
                    styles.quickIcon
                  }
                >
                  <Icon size={22} />
                </div>

                <div
                  className={
                    styles.quickContent
                  }
                >
                  <strong>
                    {title}
                  </strong>

                  <span>
                    {description}
                  </span>
                </div>

                <ArrowRight
                  size={18}
                  className={
                    styles.arrow
                  }
                />
              </Link>
            ),
          )}
        </div>
      </section>

      <section
        className={
          styles.activityCard
        }
      >
        <div
          className={
            styles.activityIcon
          }
        >
          <Clock3 size={23} />
        </div>

        <div>
          <h3>
            Operational activity
          </h3>

          <p>
            Live order and pickup
            activity will appear here
            from the vendor dashboard
            API. No placeholder
            business data is shown.
          </p>
        </div>
      </section>
    </div>
  );
}