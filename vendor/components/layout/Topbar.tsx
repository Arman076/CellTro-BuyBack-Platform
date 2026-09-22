"use client";

import { Bell, Menu, Search } from "lucide-react";

import styles from "./Topbar.module.css";

interface TopbarProps {
  onOpenMenu: () => void;
}

export default function Topbar({ onOpenMenu }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <button
        type="button"
        className={styles.menuButton}
        onClick={onOpenMenu}
        aria-label="Open navigation menu"
      >
        <Menu size={22} />
      </button>

      <div className={styles.search}>
        <Search size={18} aria-hidden="true" />

        <input
          type="search"
          placeholder="Search orders, customers, or agents..."
          aria-label="Search vendor panel"
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.notificationButton}
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>

        <div className={styles.vendor}>
          <div className={styles.avatar}>VS</div>

          <div className={styles.vendorText}>
            <strong>Vendor</strong>
            <span>Celltro Partner</span>
          </div>
        </div>
      </div>
    </header>
  );
}