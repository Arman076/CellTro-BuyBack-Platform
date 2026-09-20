import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  API_BASE_URL,
} from "@/lib/api";

export async function GET(
  request: NextRequest,
) {
  const incoming =
    request.nextUrl
      .searchParams;

  const outgoing =
    new URLSearchParams();

  const allowed = [
  "search",
  "status",
  "statusGroup",
  "from",
  "to",
  "page",
  "limit",
];

  for (
    const key of allowed
  ) {
    const value =
      incoming.get(key);

    if (value) {
      outgoing.set(
        key,
        value,
      );
    }
  }

  const url =
    `${API_BASE_URL}/super-admin/orders` +
    (outgoing.size > 0
      ? `?${outgoing.toString()}`
      : "");

  try {
    const response =
      await fetch(url, {
        cache: "no-store",

        headers: {
          Accept:
            "application/json",

          cookie:
            request.headers.get(
              "cookie",
            ) ?? "",
        },
      });

    const body =
      await response.text();

    return new NextResponse(
      body,
      {
        status:
          response.status,

        headers: {
          "Content-Type":
            response.headers.get(
              "content-type",
            ) ??
            "application/json",
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        message:
          "Backend orders service unavailable.",
      },
      {
        status: 502,
      },
    );
  }
}