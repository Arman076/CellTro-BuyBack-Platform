import type { LucideIcon } from "lucide-react";

import styles from "./StatCard.module.css";

interface StatCardProps {
  title: string;
  value?: number;
  icon: LucideIcon;
  tone: "blue" | "green" | "orange" | "emerald";
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  tone,
}: StatCardProps) {
  return (
    <article className={styles.card}>
      <div>
        <p>{title}</p>
        <strong>{value ?? "—"}</strong>
      </div>

      <div className={`${styles.icon} ${styles[tone]}`}>
        <Icon size={21} strokeWidth={1.8} />
      </div>
    </article>
  );
}