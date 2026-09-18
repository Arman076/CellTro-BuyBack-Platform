"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";

import {
  Smartphone,
  X,
} from "lucide-react";

import {
  navigationSections,
} from "@/config/navigation";

import styles from "./Sidebar.module.css";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
};

export default function Sidebar({
  open,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }

    return pathname.startsWith(href);
  }

  return (
    <>
      <aside
        className={`${styles.sidebar} ${
          open ? styles.sidebarOpen : ""
        }`}
      >
        <div className={styles.brand}>
          <div className={styles.brandIcon}>
            <Smartphone size={22} />
          </div>

          <div className={styles.brandText}>
            <strong>CELLTRO</strong>

            <span>SUPER ADMIN</span>
          </div>

          <button
            type="button"
            className={styles.mobileClose}
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X size={22} />
          </button>
        </div>

        <nav className={styles.navigation}>
          {navigationSections.map(
            (section, sectionIndex) => (
              <div
                className={styles.section}
                key={`${section.title}-${sectionIndex}`}
              >
                {section.title && (
                  <div className={styles.sectionTitle}>
                    {section.title}
                  </div>
                )}

                <div className={styles.sectionItems}>
                  {section.items.map((item) => {
                    const Icon = item.icon;

                    const active =
                      isActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={`${styles.navigationLink} ${
                          active
                            ? styles.navigationLinkActive
                            : ""
                        }`}
                      >
                        <Icon
                          size={19}
                          strokeWidth={1.9}
                        />

                        <span>
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.environment}>
            <span
              className={styles.environmentDot}
            />

            <span>System Online</span>
          </div>

          <small>
            Celltro Control Center
          </small>
        </div>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className={styles.overlay}
          onClick={onClose}
        />
      )}
    </>
  );
}