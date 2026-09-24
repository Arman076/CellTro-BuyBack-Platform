import {
  NextRequest,
  NextResponse,
} from "next/server";

const API_BASE_URL = (
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:4000"
).replace(/\/$/, "");

export const dynamic =
  "force-dynamic";

type RouteContext = {
  params: Promise<{
    segments: string[];
  }>;
};

const ALLOWED_QUERY_PARAMS =
  new Set([
    "search",
    "status",
    "page",
    "limit",
  ]);

function safeSegments(
  segments: string[],
) {
  return segments.filter(
    (segment) =>
      /^[A-Za-z0-9_-]+$/.test(
        segment,
      ),
  );
}

async function proxyRequest(
  request: NextRequest,
  context: RouteContext,
  method: "GET" | "PATCH",
) {
  try {
    const { segments } =
      await context.params;

    const cleanSegments =
      safeSegments(
        segments ?? [],
      );

    if (
      !segments?.length ||
      cleanSegments.length !==
        segments.length
    ) {
      return NextResponse.json(
        {
          message:
            "Invalid vendor path.",
        },
        {
          status: 400,
        },
      );
    }

    const backendUrl =
      new URL(
        `/super-admin/vendors/${cleanSegments
          .map(
            encodeURIComponent,
          )
          .join("/")}`,
        API_BASE_URL,
      );

    for (
      const [
        key,
        value,
      ] of request.nextUrl
        .searchParams
    ) {
      if (
        ALLOWED_QUERY_PARAMS.has(
          key,
        )
      ) {
        backendUrl.searchParams.set(
          key,
          value,
        );
      }
    }

    const headers: HeadersInit = {
      Accept:
        "application/json",
    };

    const cookie =
      request.headers.get(
        "cookie",
      );

    if (cookie) {
      headers.Cookie =
        cookie;
    }

    let body:
      | string
      | undefined;

    if (method === "PATCH") {
      const contentType =
        request.headers.get(
          "content-type",
        ) ?? "";

      if (
        !contentType
          .toLowerCase()
          .includes(
            "application/json",
          )
      ) {
        return NextResponse.json(
          {
            message:
              "Content-Type must be application/json.",
          },
          {
            status: 415,
          },
        );
      }

      const contentLength =
        request.headers.get(
          "content-length",
        );

      if (
        contentLength &&
        Number(contentLength) >
          32_768
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
        JSON.stringify(
          payload,
        );

      headers[
        "Content-Type"
      ] =
        "application/json";
    }

    const response =
      await fetch(
        backendUrl.toString(),
        {
          method,
          headers,
          body,
          cache: "no-store",
        },
      );

    const text =
      await response.text();

    const responseContentType =
      response.headers.get(
        "content-type",
      ) ?? "";

    if (
      !responseContentType.includes(
        "application/json",
      )
    ) {
      return NextResponse.json(
        {
          message:
            response.ok
              ? "Vendor backend returned an invalid response."
              : "Vendor backend request failed.",
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
        text
          ? JSON.parse(text)
          : {};
    } catch {
      return NextResponse.json(
        {
          message:
            "Vendor backend returned malformed JSON.",
        },
        {
          status: 502,
        },
      );
    }

    return NextResponse.json(
      payload,
      {
        status:
          response.status,
      },
    );
  } catch (error) {
    console.error(
      "Vendor API proxy error:",
      error,
    );

    return NextResponse.json(
      {
        message:
          "Unable to reach the vendor service.",
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

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  return proxyRequest(
    request,
    context,
    "PATCH",
  );
}