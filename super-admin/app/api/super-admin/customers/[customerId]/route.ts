import {
  NextRequest,
  NextResponse,
} from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  process.env.API_URL ??
  "http://localhost:4000";

type RouteContext = {
  params: Promise<{
    customerId: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { customerId } =
      await context.params;

    if (
      !customerId ||
      !/^\d+$/.test(customerId)
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid customer ID.",
        },
        {
          status: 400,
        },
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/super-admin/customers/${encodeURIComponent(
        customerId,
      )}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );

    const contentType =
      response.headers.get(
        "content-type",
      ) ?? "";

    if (
      !contentType
        .toLowerCase()
        .includes("application/json")
    ) {
      return NextResponse.json(
        {
          message:
            "Customer backend returned an invalid response.",
        },
        {
          status: 502,
        },
      );
    }

    const body =
      await response.json();

    return NextResponse.json(
      body,
      {
        status: response.status,
      },
    );
  } catch (error) {
    console.error(
      "Customer detail API proxy error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Unable to connect to customer backend.",
      },
      {
        status: 502,
      },
    );
  }
}