import {
  NextRequest,
  NextResponse,
} from "next/server";

const BACKEND_API_URL =
  (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000"
  ).replace(/\/$/, "");

export const dynamic =
  "force-dynamic";

export async function GET(
  request: NextRequest,
) {
  try {
    const from =
      request.nextUrl.searchParams.get(
        "from",
      );

    const to =
      request.nextUrl.searchParams.get(
        "to",
      );

    if (!from || !to) {
      return NextResponse.json(
        {
          message:
            "from and to dates are required.",
        },
        {
          status: 400,
        },
      );
    }

    const params =
      new URLSearchParams({
        from,
        to,
      });

    const backendUrl =
      `${BACKEND_API_URL}/super-admin/dashboard?${params.toString()}`;

    const cookie =
      request.headers.get(
        "cookie",
      );

    const response =
      await fetch(
        backendUrl,
        {
          method: "GET",

          cache: "no-store",

          headers: {
            Accept:
              "application/json",

            ...(cookie
              ? {
                  Cookie:
                    cookie,
                }
              : {}),
          },
        },
      );

    const rawBody =
      await response.text();

    let body: unknown;

    try {
      body =
        rawBody
          ? JSON.parse(
              rawBody,
            )
          : {};
    } catch {
      body = {
        message:
          rawBody ||
          "Backend returned an invalid response.",
      };
    }

    if (!response.ok) {
      return NextResponse.json(
        body,
        {
          status:
            response.status,
        },
      );
    }

    return NextResponse.json(
      body,
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error(
      "Super Admin dashboard proxy error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Celltro backend is not reachable on port 4000.",
      },
      {
        status: 503,
      },
    );
  }
}