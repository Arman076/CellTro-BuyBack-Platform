import {
  NextRequest,
  NextResponse,
} from "next/server";

const BACKEND_URL = (
  process.env.BACKEND_URL ??
  process.env.API_URL ??
  "http://localhost:4000"
).replace(/\/$/, "");

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    segments?: string[];
  }>;
};

const ALLOWED_QUERY_PARAMS = new Set([
  "search",
  "coverage",
  "assignment",
  "status",
  "page",
  "limit",
]);

function safeSegments(
  segments: string[] | undefined,
) {
  if (!segments) {
    return [];
  }

  return segments.filter((segment) =>
    /^[A-Za-z0-9_-]+$/.test(segment),
  );
}

async function proxyRequest(
  request: NextRequest,
  context: RouteContext,
  method: "GET" | "POST",
) {
  try {
    const { segments } =
      await context.params;

    const cleanSegments =
      safeSegments(segments);

    if (
      (segments?.length ?? 0) !==
      cleanSegments.length
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid routing path.",
        },
        {
          status: 400,
        },
      );
    }

    const backendUrl = new URL(
      `/super-admin/routing${
        cleanSegments.length
          ? `/${cleanSegments
              .map(encodeURIComponent)
              .join("/")}`
          : ""
      }`,
      BACKEND_URL,
    );

    for (const [
      key,
      value,
    ] of request.nextUrl.searchParams) {
      if (
        ALLOWED_QUERY_PARAMS.has(key)
      ) {
        backendUrl.searchParams.set(
          key,
          value,
        );
      }
    }

    const headers: HeadersInit = {
      Accept: "application/json",
    };

    const cookie =
      request.headers.get("cookie");

    if (cookie) {
      headers.Cookie = cookie;
    }

    let body:
      | string
      | undefined;

    if (method === "POST") {
      headers["Content-Type"] =
        "application/json";

      const contentLength =
        request.headers.get(
          "content-length",
        );

      if (
        contentLength &&
        Number(contentLength) >
          16_384
      ) {
        return NextResponse.json(
          {
            message:
              "Request body is too large.",
          },
          {
            status: 413,
          },
        );
      }

      const payload =
        await request.json();

      body =
        JSON.stringify(payload);
    }

    const response =
      await fetch(
        backendUrl.toString(),
        {
          method,
          cache: "no-store",
          headers,
          body,
        },
      );

    const responseText =
      await response.text();

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
            response.ok
              ? "Routing backend returned an invalid response."
              : "Routing backend request failed.",
        },
        {
          status:
            response.ok
              ? 502
              : response.status,
        },
      );
    }

    let payload: unknown;

    try {
      payload =
        responseText
          ? JSON.parse(
              responseText,
            )
          : {};
    } catch {
      return NextResponse.json(
        {
          message:
            "Routing backend returned malformed JSON.",
        },
        {
          status: 502,
        },
      );
    }

    return NextResponse.json(
      payload,
      {
        status: response.status,
      },
    );
  } catch (error) {
    console.error(
      "Routing API proxy error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Routing backend is unavailable.",
      },
      {
        status: 502,
      },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  return proxyRequest(
    request,
    context,
    "GET",
  );
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  return proxyRequest(
    request,
    context,
    "POST",
  );
}