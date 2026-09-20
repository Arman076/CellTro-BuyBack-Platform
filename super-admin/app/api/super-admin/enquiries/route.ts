import {
  NextRequest,
  NextResponse,
} from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:4000";

const ALLOWED_PARAMS = [
  "search",
  "from",
  "to",
  "page",
  "limit",
] as const;

export async function GET(
  request: NextRequest,
) {
  try {
    const backendUrl = new URL(
      "/super-admin/enquiries",
      API_BASE_URL,
    );

    for (const key of ALLOWED_PARAMS) {
      const value =
        request.nextUrl.searchParams.get(key);

      if (value) {
        backendUrl.searchParams.set(
          key,
          value,
        );
      }
    }

    const cookie =
      request.headers.get("cookie");

    const response = await fetch(
      backendUrl,
      {
        method: "GET",

        headers: {
          Accept: "application/json",

          ...(cookie
            ? {
                Cookie: cookie,
              }
            : {}),
        },

        cache: "no-store",
      },
    );

    const contentType =
      response.headers.get(
        "content-type",
      ) ?? "";

    const body =
      contentType.includes(
        "application/json",
      )
        ? await response.json()
        : {
            message:
              "Unexpected backend response.",
          };

    return NextResponse.json(
      body,
      {
        status: response.status,
      },
    );
  } catch {
    return NextResponse.json(
      {
        message:
          "Unable to connect to the backend.",
      },
      {
        status: 502,
      },
    );
  }
}