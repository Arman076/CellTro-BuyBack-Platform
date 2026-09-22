import { NextRequest, NextResponse } from "next/server";

const REQUEST_TIMEOUT_MS = 15_000;

type RouteContext = {
  params: Promise<{
    segments?: string[];
  }>;
};

function getBackendBaseUrl(): string {
  const configured =
    process.env.BACKEND_URL?.trim() ||
    process.env.API_URL?.trim() ||
    "http://localhost:4000";

  return configured.replace(/\/+$/, "");
}

function buildBackendUrl(
  request: NextRequest,
  segments: string[] | undefined,
): URL {
  const baseUrl = getBackendBaseUrl();

  const encodedPath = (segments ?? [])
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const suffix = encodedPath
    ? `/${encodedPath}`
    : "";

  const target = new URL(
    `${baseUrl}/super-admin/vendor-applications${suffix}`,
  );

  request.nextUrl.searchParams.forEach(
    (value, key) => {
      target.searchParams.append(key, value);
    },
  );

  return target;
}

async function readRequestBody(
  request: NextRequest,
): Promise<string | undefined> {
  if (
    request.method === "GET" ||
    request.method === "HEAD"
  ) {
    return undefined;
  }

  const text = await request.text();

  return text.length > 0
    ? text
    : undefined;
}

async function proxyRequest(
  request: NextRequest,
  context: RouteContext,
) {
  const { segments } = await context.params;

  const target = buildBackendUrl(
    request,
    segments,
  );

  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const body =
      await readRequestBody(request);

    const response = await fetch(target, {
      method: request.method,

      headers: {
        Accept: "application/json",

        ...(body
          ? {
              "Content-Type":
                request.headers.get(
                  "content-type",
                ) ??
                "application/json",
            }
          : {}),
      },

      body,

      cache: "no-store",
      signal: controller.signal,
    });

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
            "Backend returned an invalid response.",
        },
        {
          status: 502,
        },
      );
    }

    const payload =
      await response.json();

    return NextResponse.json(
      payload,
      {
        status: response.status,

        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      return NextResponse.json(
        {
          message:
            "Backend request timed out.",
        },
        {
          status: 504,
        },
      );
    }

    return NextResponse.json(
      {
        message:
          "Unable to connect to the backend service.",
      },
      {
        status: 502,
      },
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  return proxyRequest(
    request,
    context,
  );
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  return proxyRequest(
    request,
    context,
  );
}