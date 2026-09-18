import {
  Bell,
  ChevronDown,
  Menu,
  Search,
} from "lucide-react";

import styles from "./Topbar.module.css";

type TopbarProps = {
  onMenuClick: () => void;
};

export default function Topbar({
  onMenuClick,
}: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu size={23} />
        </button>

        <div className={styles.searchBox}>
          <Search
            size={18}
            className={styles.searchIcon}
          />

          <input
            type="search"
            placeholder="Search orders, customers, vendors..."
            aria-label="Search"
          />
        </div>
      </div>

      <div className={styles.right}>
        <button
          type="button"
          className={styles.notificationButton}
          aria-label="Notifications"
        >
          <Bell size={20} />

          <span
            className={styles.notificationDot}
          />
        </button>

        <button
          type="button"
          className={styles.profileButton}
        >
          <span className={styles.avatar}>
            SA
          </span>

          <span className={styles.profileText}>
            <strong>Super Admin</strong>
            <small>Platform Owner</small>
          </span>

          <ChevronDown
            size={16}
            className={styles.chevron}
          />
        </button>
      </div>
    </header>
  );
}