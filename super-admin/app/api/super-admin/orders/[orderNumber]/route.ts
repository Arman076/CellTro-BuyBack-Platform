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

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    orderNumber: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { orderNumber } =
      await context.params;

    if (!orderNumber) {
      return NextResponse.json(
        {
          message:
            "Order number is required.",
        },
        {
          status: 400,
        },
      );
    }

    const cookie =
      request.headers.get(
        "cookie",
      );

    const response =
      await fetch(
        `${BACKEND_API_URL}/super-admin/orders/${encodeURIComponent(
          orderNumber,
        )}`,
        {
          method: "GET",
          cache: "no-store",

          headers: {
            Accept:
              "application/json",

            ...(cookie
              ? {
                  Cookie: cookie,
                }
              : {}),
          },
        },
      );

    const rawBody =
      await response.text();

    let body: unknown;

    try {
      body = rawBody
        ? JSON.parse(rawBody)
        : {};
    } catch {
      body = {
        message:
          rawBody ||
          "Backend returned an invalid response.",
      };
    }

    return NextResponse.json(
      body,
      {
        status: response.status,
      },
    );
  } catch (error) {
    console.error(
      "Super Admin order details proxy error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Celltro backend is not reachable.",
      },
      {
        status: 503,
      },
    );
  }
}