import {
  NextRequest,
  NextResponse,
} from "next/server";

const API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:4000";

const ALLOWED_QUERY_PARAMS = new Set([
  "search",
  "status",
  "page",
  "limit",
]);

function backendUrl(
  request: NextRequest,
  segments: string[],
) {
  const encodedPath = segments
    .map((segment) =>
      encodeURIComponent(segment),
    )
    .join("/");

  const url = new URL(
    `/super-admin/vendors${
      encodedPath
        ? `/${encodedPath}`
        : ""
    }`,
    API_BASE_URL,
  );

  for (
    const [key, value] of
      request.nextUrl.searchParams
  ) {
    if (
      ALLOWED_QUERY_PARAMS.has(key)
    ) {
      url.searchParams.append(
        key,
        value,
      );
    }
  }

  return url;
}

async function proxy(
  request: NextRequest,
  context: {
    params: Promise<{
      segments?: string[];
    }>;
  },
  method: "GET" | "PATCH",
) {
  try {
    const { segments = [] } =
      await context.params;

    const cookie =
      request.headers.get("cookie");

    const headers = new Headers({
      Accept: "application/json",
    });

    if (cookie) {
      headers.set("Cookie", cookie);
    }

    let body: string | undefined;

    if (method === "PATCH") {
      const contentType =
        request.headers.get(
          "content-type",
        ) ?? "";

      if (
        !contentType
          .toLowerCase()
          .startsWith(
            "application/json",
          )
      ) {
        return NextResponse.json(
          {
            message:
              "Content-Type must be application/json.",
          },
          { status: 415 },
        );
      }

      body = await request.text();

      headers.set(
        "Content-Type",
        "application/json",
      );
    }

    const response = await fetch(
      backendUrl(
        request,
        segments,
      ),
      {
        method,
        headers,
        body,
        cache: "no-store",
      },
    );

    const responseContentType =
      response.headers.get(
        "content-type",
      ) ?? "";

    const payload =
      responseContentType.includes(
        "application/json",
      )
        ? await response.json()
        : {
            message:
              "Unexpected backend response.",
          };

    return NextResponse.json(
      payload,
      {
        status: response.status,
      },
    );
  } catch {
    return NextResponse.json(
      {
        message:
          "Unable to reach the vendor service.",
      },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      segments?: string[];
    }>;
  },
) {
  return proxy(
    request,
    context,
    "GET",
  );
}

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      segments?: string[];
    }>;
  },
) {
  return proxy(
    request,
    context,
    "PATCH",
  );
}
