"use client";

import {
  LayoutDashboard,
  PackageCheck,
  ClipboardList,
  Users,
  WalletCards,
  UserRound,
  LogOut,
  Menu,
  X,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import {
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import Link from "next/link";

import { vendorApi } from "@/lib/vendor-api";

import styles from "./VendorShell.module.css";

interface VendorSession {
  authenticated: boolean;
  mustChangePassword: boolean;

  user: {
    email: string;
    role: string;
  };

  vendor: {
    vendorCode: string;
    businessName: string;
  };
}

interface Props {
  children: ReactNode;
}

const PUBLIC_ROUTES = [
  "/vendor/login",
  "/vendor/signup",
  "/vendor/forgot-password",
  "/vendor/reset-password",
  "/vendor/verify-email",
];

const navItems = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Orders",
    href: "/vendor/orders",
    icon: ClipboardList,
  },
  {
    label: "Pickups",
    href: "/vendor/pickups",
    icon: PackageCheck,
  },
  {
    label: "Agents",
    href: "/vendor/agents",
    icon: Users,
  },
  {
    label: "Wallet",
    href: "/vendor/wallet",
    icon: WalletCards,
  },
];

function isPublicRoute(
  pathname: string,
) {
  return PUBLIC_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(
        `${route}/`,
      ),
  );
}

function isActiveRoute(
  pathname: string,
  href: string,
) {
  if (href === "/") {
    return pathname === "/";
  }

  return (
    pathname === href ||
    pathname.startsWith(
      `${href}/`,
    )
  );
}

function getLoginUrl(
  pathname: string,
) {
  if (
    !pathname ||
    pathname === "/"
  ) {
    return "/vendor/login";
  }

  return `/vendor/login?returnTo=${encodeURIComponent(
    pathname,
  )}`;
}

export default function VendorShell({
  children,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [session, setSession] =
    useState<VendorSession | null>(
      null,
    );

  const [checking, setChecking] =
    useState(true);

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  const publicPage =
    isPublicRoute(pathname);

  const verifySession =
    useCallback(async () => {
      if (publicPage) {
        setChecking(false);
        return;
      }

      setChecking(true);

      try {
        const result =
          await vendorApi<VendorSession>(
            "/vendor-auth/me",
            {
              method: "GET",
              cache: "no-store",
            },
          );

        if (
          !result.authenticated
        ) {
          throw new Error(
            "Authentication required",
          );
        }

        setSession(result);

        /*
         * Vendor logged in using the
         * temporary password.
         *
         * Do not allow dashboard access
         * until password is changed.
         */
        if (
          result.mustChangePassword &&
          pathname !==
            "/vendor/change-password"
        ) {
          router.replace(
            "/vendor/change-password",
          );
        }
      } catch {
        setSession(null);

        router.replace(
          getLoginUrl(pathname),
        );
      } finally {
        setChecking(false);
      }
    }, [
      pathname,
      publicPage,
      router,
    ]);

  useEffect(() => {
    void verifySession();
  }, [verifySession]);

  /*
   * Close mobile drawer after
   * route navigation.
   */
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  async function logout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await vendorApi(
        "/vendor-auth/logout",
        {
          method: "POST",
        },
      );
    } catch {
      /*
       * Even if server logout fails,
       * don't keep protected UI open.
       */
    } finally {
      setSession(null);

      setLoggingOut(false);

      router.replace(
        "/vendor/login",
      );

      router.refresh();
    }
  }

  /*
   * Auth/signup/reset pages must not
   * receive dashboard sidebar/topbar.
   */
  if (publicPage) {
    return <>{children}</>;
  }

  /*
   * Never flash protected dashboard
   * before /vendor-auth/me completes.
   */
  if (
    checking ||
    !session
  ) {
    return (
      <div
        className={
          styles.authLoading
        }
      >
        <div
          className={
            styles.loaderCard
          }
        >
          <div
            className={
              styles.loaderLogo
            }
          >
            C
          </div>

          <LoaderCircle
            size={27}
            className={
              styles.spinner
            }
          />

          <strong>
            Securing your workspace
          </strong>

          <span>
            Verifying vendor session...
          </span>
        </div>
      </div>
    );
  }

  /*
   * Password-change route is
   * authenticated but intentionally
   * shown without dashboard chrome.
   */
  if (
    pathname ===
    "/vendor/change-password"
  ) {
    return <>{children}</>;
  }

  return (
    <div
      className={
        styles.shell
      }
    >
      {sidebarOpen && (
        <button
          type="button"
          className={
            styles.overlay
          }
          onClick={() =>
            setSidebarOpen(false)
          }
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`${styles.sidebar} ${
          sidebarOpen
            ? styles.sidebarOpen
            : ""
        }`}
      >
        <div
          className={
            styles.sidebarHeader
          }
        >
          <Link
            href="/"
            className={
              styles.brand
            }
          >
            <div
              className={
                styles.brandIcon
              }
            >
              C
            </div>

            <div>
              <strong>
                CELLTRO
              </strong>

              <span>
                Vendor Portal
              </span>
            </div>
          </Link>

          <button
            type="button"
            className={
              styles.mobileClose
            }
            onClick={() =>
              setSidebarOpen(false)
            }
            aria-label="Close menu"
          >
            <X size={21} />
          </button>
        </div>

        <div
          className={
            styles.vendorCard
          }
        >
          <div
            className={
              styles.vendorAvatar
            }
          >
            {session.vendor.businessName
              ?.charAt(0)
              .toUpperCase() ||
              "V"}
          </div>

          <div
            className={
              styles.vendorInfo
            }
          >
            <strong>
              {
                session.vendor
                  .businessName
              }
            </strong>

            <span>
              {
                session.vendor
                  .vendorCode
              }
            </span>
          </div>

          <ShieldCheck
            size={17}
            className={
              styles.verifiedIcon
            }
          />
        </div>

        <div
          className={
            styles.navLabel
          }
        >
          WORKSPACE
        </div>

        <nav
          className={
            styles.navigation
          }
        >
          {navItems.map(
            ({
              label,
              href,
              icon: Icon,
            }) => {
              const active =
                isActiveRoute(
                  pathname,
                  href,
                );

              return (
                <Link
                  key={href}
                  href={href}
                  className={`${styles.navItem} ${
                    active
                      ? styles.navItemActive
                      : ""
                  }`}
                >
                  <Icon
                    size={20}
                  />

                  <span>
                    {label}
                  </span>

                  {active && (
                    <span
                      className={
                        styles.activeDot
                      }
                    />
                  )}
                </Link>
              );
            },
          )}
        </nav>

        <div
          className={
            styles.sidebarBottom
          }
        >
          <Link
            href="/vendor/profile"
            className={`${styles.navItem} ${
              isActiveRoute(
                pathname,
                "/vendor/profile",
              )
                ? styles.navItemActive
                : ""
            }`}
          >
            <UserRound
              size={20}
            />

            <span>
              Profile
            </span>
          </Link>

          <button
            type="button"
            className={
              styles.logoutButton
            }
            disabled={
              loggingOut
            }
            onClick={logout}
          >
            {loggingOut ? (
              <LoaderCircle
                size={19}
                className={
                  styles.spinner
                }
              />
            ) : (
              <LogOut
                size={19}
              />
            )}

            <span>
              {loggingOut
                ? "Signing out..."
                : "Logout"}
            </span>
          </button>
        </div>
      </aside>

      <div
        className={
          styles.workspace
        }
      >
        <header
          className={
            styles.topbar
          }
        >
          <div
            className={
              styles.topbarLeft
            }
          >
            <button
              type="button"
              className={
                styles.menuButton
              }
              onClick={() =>
                setSidebarOpen(
                  true,
                )
              }
              aria-label="Open menu"
            >
              <Menu
                size={22}
              />
            </button>

            <div
              className={
                styles.pageTitle
              }
            >
              <strong>
                {getPageTitle(
                  pathname,
                )}
              </strong>

              <span>
                Vendor Workspace
              </span>
            </div>
          </div>

          <div
            className={
              styles.account
            }
          >
            <div
              className={
                styles.accountText
              }
            >
              <strong>
                {
                  session.vendor
                    .businessName
                }
              </strong>

              <span>
                {
                  session.user
                    .email
                }
              </span>
            </div>

            <Link
              href="/vendor/profile"
              className={
                styles.accountAvatar
              }
              aria-label="Open profile"
            >
              {session.vendor.businessName
                ?.charAt(0)
                .toUpperCase() ||
                "V"}
            </Link>
          </div>
        </header>

        <main
          className={
            styles.content
          }
        >
          {children}
        </main>

        <nav
          className={
            styles.mobileNav
          }
        >
          {navItems
            .slice(0, 4)
            .map(
              ({
                label,
                href,
                icon: Icon,
              }) => {
                const active =
                  isActiveRoute(
                    pathname,
                    href,
                  );

                return (
                  <Link
                    href={href}
                    key={href}
                    className={
                      active
                        ? styles.mobileNavActive
                        : ""
                    }
                  >
                    <Icon
                      size={20}
                    />

                    <span>
                      {label}
                    </span>
                  </Link>
                );
              },
            )}
        </nav>
      </div>
    </div>
  );
}

function getPageTitle(
  pathname: string,
) {
  if (pathname === "/") {
    return "Dashboard";
  }

  if (
    pathname.startsWith(
      "/vendor/orders",
    )
  ) {
    return "Orders";
  }

  if (
    pathname.startsWith(
      "/vendor/pickups",
    )
  ) {
    return "Pickups";
  }

  if (
    pathname.startsWith(
      "/vendor/agents",
    )
  ) {
    return "Agents";
  }

  if (
    pathname.startsWith(
      "/vendor/wallet",
    )
  ) {
    return "Wallet";
  }

  if (
    pathname.startsWith(
      "/vendor/profile",
    )
  ) {
    return "Profile";
  }

  return "Vendor Portal";
}