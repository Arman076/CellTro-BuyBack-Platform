"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

import { vendorNavigation } from "@/config/navigation";
import styles from "./MobileNav.module.css";

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileNav({
  open,
  onClose,
}: MobileNavProps) {
  const pathname = usePathname();

  if (!open) {
    return null;
  }

  return (
    <div className={styles.overlay}>
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        aria-label="Close navigation"
      />

      <aside className={styles.drawer}>
        <div className={styles.header}>
          <Link href="/" className={styles.brand} onClick={onClose}>
            <span className={styles.logo}>c</span>
            <strong>celltro</strong>
          </Link>

          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={21} />
          </button>
        </div>

        <nav className={styles.navigation}>
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
                onClick={onClose}
                className={`${styles.item} ${
                  active ? styles.active : ""
                }`}
              >
                <Icon size={19} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}