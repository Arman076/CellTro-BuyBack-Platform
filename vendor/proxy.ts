import {
  NextRequest,
  NextResponse,
} from "next/server";

const PUBLIC_PATHS = [
  "/vendor/login",
  "/vendor/signup",
  "/vendor/verify-email",
  "/vendor/application-submitted",
  "/vendor/forgot-password",
  "/vendor/reset-password",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`),
  );
}

export function proxy(
  request: NextRequest,
) {
  const { pathname } =
    request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const session =
    request.cookies.get(
      "celltro_vendor_session",
    );

  if (!session) {
    const loginUrl =
      new URL(
        "/vendor/login",
        request.url,
      );

    if (pathname !== "/") {
      loginUrl.searchParams.set(
        "returnTo",
        `${pathname}${request.nextUrl.search}`,
      );
    }

    return NextResponse.redirect(
      loginUrl,
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/orders/:path*",
    "/agents/:path*",
    "/wallet/:path*",
    "/profile/:path*",
    "/vendor/change-password",
  ],
};