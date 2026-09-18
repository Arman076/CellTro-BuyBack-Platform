"use client";

import {
  useState,
} from "react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

import styles from "./SuperAdminShell.module.css";

type SuperAdminShellProps = {
  children: React.ReactNode;
};

export default function SuperAdminShell({
  children,
}: SuperAdminShellProps) {
  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  return (
    <div className={styles.shell}>
      <Sidebar
        open={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
      />

      <div className={styles.contentArea}>
        <Topbar
          onMenuClick={() =>
            setSidebarOpen(true)
          }
        />

        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}