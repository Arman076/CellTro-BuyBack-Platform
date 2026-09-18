import {
  NextRequest,
  NextResponse,
} from "next/server";

const BACKEND_API_URL =
  (
    process.env.API_URL ||
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

    const response =
      await fetch(
        `${BACKEND_API_URL}/super-admin/dashboard?${params.toString()}`,
        {
          method: "GET",

          cache: "no-store",

          headers: {
            Accept:
              "application/json",
          },
        },
      );

    const responseText =
      await response.text();

    let body: unknown;

    try {
      body =
        responseText
          ? JSON.parse(
              responseText,
            )
          : {};
    } catch {
      body = {
        message:
          responseText ||
          "Invalid backend response.",
      };
    }

    return NextResponse.json(
      body,
      {
        status:
          response.status,
      },
    );
  } catch (error) {
    console.error(
      "Dashboard proxy error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Backend dashboard service is unavailable.",
      },
      {
        status: 503,
      },
    );
  }
}