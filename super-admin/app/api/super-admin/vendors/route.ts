import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const backendUrl =
  process.env.BACKEND_URL ??
  process.env.API_URL ??
  "http://localhost:4000";

async function safeJson(response: Response) {
  const contentType =
    response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const incoming = request.nextUrl.searchParams;

    const params = new URLSearchParams();

    for (const key of [
      "search",
      "status",
      "page",
      "limit",
    ]) {
      const value = incoming.get(key);

      if (value) {
        params.set(key, value);
      }
    }

    const response = await fetch(
      `${backendUrl}/super-admin/vendors?${params.toString()}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      },
    );

    const payload = await safeJson(response);

    if (!response.ok) {
      return NextResponse.json(
        payload ?? {
          message: "Unable to load vendors.",
        },
        {
          status: response.status,
        },
      );
    }

    if (!payload) {
      return NextResponse.json(
        {
          message:
            "Vendor service returned an invalid response.",
        },
        {
          status: 502,
        },
      );
    }

    return NextResponse.json(payload);
  } catch {
    return NextResponse.json(
      {
        message: "Vendor service is unavailable.",
      },
      {
        status: 502,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(
      `${backendUrl}/super-admin/vendors`,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    const payload = await safeJson(response);

    if (!response.ok) {
      return NextResponse.json(
        payload ?? {
          message: "Unable to create vendor.",
        },
        {
          status: response.status,
        },
      );
    }

    if (!payload) {
      return NextResponse.json(
        {
          message:
            "Vendor service returned an invalid response.",
        },
        {
          status: 502,
        },
      );
    }

    return NextResponse.json(payload, {
      status: 201,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Vendor service is unavailable.",
      },
      {
        status: 502,
      },
    );
  }
}