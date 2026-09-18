import type { LucideIcon } from "lucide-react";

import styles from "./StatCard.module.css";

export type StatCardTone =
  | "blue"
  | "indigo"
  | "green"
  | "emerald"
  | "purple"
  | "amber"
  | "orange"
  | "red"
  | "rose"
  | "cyan";

type StatCardProps = {
  title: string;

  value:
    | string
    | number
    | null
    | undefined;

  icon: LucideIcon;

  subtitle?: string;

  tone?: StatCardTone;
};

export default function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
  tone = "blue",
}: StatCardProps) {
  const hasValue =
    value !== null &&
    value !== undefined;

  return (
    <article
      className={`${styles.card} ${styles[`card_${tone}`]}`}
    >
      <div
        className={`${styles.icon} ${styles[tone]}`}
      >
        <Icon size={21} strokeWidth={2.1} />
      </div>

      <p className={styles.title}>
        {title}
      </p>

      <strong className={styles.value}>
        {hasValue ? value : "—"}
      </strong>

      {subtitle && (
        <p className={styles.subtitle}>
          {subtitle}
        </p>
      )}
    </article>
  );
}
