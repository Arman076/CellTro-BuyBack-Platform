'use client';

import {
  usePathname,
  useRouter,
} from 'next/navigation';

import {
  logoutAgent,
} from '@/lib/agent-api';

import './agent-sidebar.css';

type Props = {
  agentName?: string;
  agentCode?: string;
  open: boolean;
  onClose: () => void;
};

type NavigationItem = {
  label: string;
  icon: string;
  href: string;
  type:
    | 'dashboard'
    | 'orders'
    | 'completed'
    | 'profile';
};

const NAVIGATION: NavigationItem[] = [
  {
    label: 'Dashboard',
    icon: '⌂',
    href: '/dashboard',
    type: 'dashboard',
  },
  {
    label: 'My Orders',
    icon: '▤',
    href: '/orders',
    type: 'orders',
  },
  {
    label: 'Completed',
    icon: '✓',
    href: '/orders?statusGroup=COMPLETED',
    type: 'completed',
  },
  {
    label: 'Profile',
    icon: '○',
    href: '/profile',
    type: 'profile',
  },
];

export default function AgentSidebar({
  agentName = 'Agent',
  agentCode = '',
  open,
  onClose,
}: Props) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  function isActive(
    item: NavigationItem,
  ) {
    if (
      item.type ===
      'dashboard'
    ) {
      return (
        pathname ===
        '/dashboard'
      );
    }

    if (
      item.type ===
      'orders' ||
      item.type ===
      'completed'
    ) {
      return pathname.startsWith(
        '/orders',
      );
    }

    if (
      item.type ===
      'profile'
    ) {
      return pathname.startsWith(
        '/profile',
      );
    }

    return false;
  }

  async function signOut() {
    try {
      await logoutAgent();
    } finally {
      onClose();

      router.replace(
        '/login',
      );
    }
  }

  function navigate(
    href: string,
  ) {
    onClose();

    router.push(
      href,
    );
  }

  const initial =
    agentName
      .trim()
      .charAt(0)
      .toUpperCase() || 'A';

  return (
    <>
      {open && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}

      <aside
        className={
          open
            ? 'agent-sidebar agent-sidebar-open'
            : 'agent-sidebar'
        }
        aria-label="Agent sidebar"
      >
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            C
          </div>

          <div className="sidebar-logo-copy">
            <strong className="sidebar-brand">
              Celltro
            </strong>

            <span className="sidebar-brand-sub">
              Agent Workspace
            </span>
          </div>

          <button
            type="button"
            className="sidebar-close"
            aria-label="Close navigation"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="sidebar-section-label">
          WORKSPACE
        </div>

        <nav
          className="sidebar-navigation"
          aria-label="Agent navigation"
        >
          {NAVIGATION.map(
            (item) => {
              const active =
                isActive(item);

              return (
                <button
                  type="button"
                  key={item.type}
                  className={
                    active
                      ? 'sidebar-nav-item sidebar-nav-active'
                      : 'sidebar-nav-item'
                  }
                  onClick={() =>
                    navigate(
                      item.href,
                    )
                  }
                >
                  <span className="sidebar-nav-icon">
                    {item.icon}
                  </span>

                  <span className="sidebar-nav-label">
                    {item.label}
                  </span>
                </button>
              );
            },
          )}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-bottom">
          <div className="sidebar-profile">
            <div className="sidebar-avatar">
              {initial}
            </div>

            <div className="sidebar-profile-copy">
              <strong>
                {agentName}
              </strong>

              <span>
                {agentCode ||
                  'Field Agent'}
              </span>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-logout"
            onClick={() => {
              void signOut();
            }}
          >
            <span className="sidebar-logout-icon">
              ↪
            </span>

            <span>
              Sign out
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}