"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp, Leaf } from "lucide-react";

import { vendorNavigation } from "@/config/navigation";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div>
        <Link href="/" className={styles.brand} aria-label="Celltro Vendor home">
          <div className={styles.logoMark}>c</div>

          <div>
            <div className={styles.logoText}>celltro</div>
            <div className={styles.logoSubtext}>Vendor Panel</div>
          </div>
        </Link>

        <nav className={styles.navigation} aria-label="Vendor navigation">
          {vendorNavigation.map((item) => {
            const Icon = item.icon;

            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${
                  active ? styles.active : ""
                }`}
              >
                <Icon size={19} strokeWidth={1.8} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div>
        <Link href="/support" className={styles.support}>
          <CircleHelp size={18} />
          Help & Support
        </Link>

        <div className={styles.growCard}>
          <div>
            <strong>Grow Together</strong>
            <span>More devices. More value.</span>
          </div>

          <Leaf size={30} />
        </div>
      </div>
    </aside>
  );
}