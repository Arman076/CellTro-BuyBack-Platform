import {
  NextRequest,
  NextResponse,
} from "next/server";

const BACKEND_URL =
  process.env.BACKEND_URL ??
  "http://localhost:4000";

export async function GET(
  request: NextRequest,
) {
  try {
    const searchParams =
      request.nextUrl.searchParams.toString();

    const url =
      `${BACKEND_URL}/super-admin/customers` +
      (searchParams
        ? `?${searchParams}`
        : "");

    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    const contentType =
      response.headers.get(
        "content-type",
      ) ?? "";

    if (
      !contentType.includes(
        "application/json",
      )
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

    const data =
      await response.json();

    return NextResponse.json(
      data,
      {
        status: response.status,
      },
    );
  } catch (error) {
    console.error(
      "Customer API proxy error:",
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