import {
  NextRequest,
  NextResponse,
} from "next/server";

const BACKEND_URL = (
  process.env.BACKEND_URL ??
  process.env.API_URL ??
  process.env.API_BASE_URL ??
  "http://localhost:4000"
).replace(/\/$/, "");

const ALLOWED_QUERY_PARAMS = new Set([
  "page",
  "limit",
  "search",
  "coverage",
  "assignment",
  "status",
]);

type RouteContext = {
  params: Promise<{
    segments?: string[];
  }>;
};

function buildBackendUrl(
  request: NextRequest,
  segments: string[],
) {
  const safePath = segments
    .map((segment) =>
      encodeURIComponent(segment),
    )
    .join("/");

  const url = new URL(
    `${BACKEND_URL}/super-admin/routing${
      safePath ? `/${safePath}` : ""
    }`,
  );

  for (const [
    key,
    value,
  ] of request.nextUrl.searchParams.entries()) {
    if (
      ALLOWED_QUERY_PARAMS.has(key) &&
      value
    ) {
      url.searchParams.set(key, value);
    }
  }

  return url;
}

async function parseBackendResponse(
  response: Response,
) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  const contentType =
    response.headers.get("content-type") ??
    "";

  if (
    contentType.includes(
      "application/json",
    )
  ) {
    try {
      return JSON.parse(text);
    } catch {
      return {
        message:
          "Routing backend returned invalid JSON.",
      };
    }
  }

  return {
    message:
      response.ok
        ? "Unexpected routing backend response."
        : text.slice(0, 500),
  };
}

async function proxy(
  request: NextRequest,
  context: RouteContext,
  method: "GET" | "POST",
) {
  try {
    const { segments = [] } =
      await context.params;

    const backendUrl =
      buildBackendUrl(
        request,
        segments,
      );

    const headers: HeadersInit = {
      Accept: "application/json",
    };

    const cookie =
      request.headers.get("cookie");

    if (cookie) {
      headers.Cookie = cookie;
    }

    let body: string | undefined;

    if (method === "POST") {
      headers["Content-Type"] =
        "application/json";

      const requestText =
        await request.text();

      body =
        requestText || "{}";
    }

    const response = await fetch(
      backendUrl,
      {
        method,
        headers,
        body,
        cache: "no-store",
      },
    );

    const payload =
      await parseBackendResponse(
        response,
      );

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
          "Routing service is unavailable.",
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
  return proxy(
    request,
    context,
    "GET",
  );
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  return proxy(
    request,
    context,
    "POST",
  );
}