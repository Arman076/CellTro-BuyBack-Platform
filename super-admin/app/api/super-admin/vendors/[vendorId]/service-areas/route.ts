import {
  NextRequest,
  NextResponse,
} from "next/server";

export const dynamic = "force-dynamic";

const backendUrl =
  process.env.BACKEND_URL ??
  process.env.API_URL ??
  "http://localhost:4000";

type RouteContext = {
  params: Promise<{
    vendorId: string;
  }>;
};

async function safeJson(
  response: Response,
) {
  const contentType =
    response.headers.get(
      "content-type",
    ) ?? "";

  if (
    !contentType.includes(
      "application/json",
    )
  ) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function validateVendorId(
  value: string,
) {
  const vendorId = Number(value);

  if (
    !Number.isInteger(vendorId) ||
    vendorId <= 0
  ) {
    return null;
  }

  return vendorId;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { vendorId: rawVendorId } =
      await context.params;

    const vendorId =
      validateVendorId(rawVendorId);

    if (vendorId === null) {
      return NextResponse.json(
        {
          message:
            "Invalid vendor id.",
        },
        {
          status: 400,
        },
      );
    }

    const search =
      request.nextUrl.searchParams
        .get("search")
        ?.trim()
        .slice(0, 100);

    const params =
      new URLSearchParams();

    if (search) {
      params.set(
        "search",
        search,
      );
    }

    const query =
      params.size > 0
        ? `?${params.toString()}`
        : "";

    const response = await fetch(
      `${backendUrl}/super-admin/vendors/${vendorId}/service-areas${query}`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept:
            "application/json",
        },
      },
    );

    const payload =
      await safeJson(response);

    if (!response.ok) {
      return NextResponse.json(
        payload ?? {
          message:
            "Unable to load vendor service areas.",
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

    return NextResponse.json(
      payload,
    );
  } catch {
    return NextResponse.json(
      {
        message:
          "Vendor service is unavailable.",
      },
      {
        status: 502,
      },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { vendorId: rawVendorId } =
      await context.params;

    const vendorId =
      validateVendorId(rawVendorId);

    if (vendorId === null) {
      return NextResponse.json(
        {
          message:
            "Invalid vendor id.",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      !Array.isArray(body.areas)
    ) {
      return NextResponse.json(
        {
          message:
            "areas must be an array.",
        },
        {
          status: 400,
        },
      );
    }

    if (body.areas.length > 500) {
      return NextResponse.json(
        {
          message:
            "A maximum of 500 service areas can be submitted at once.",
        },
        {
          status: 400,
        },
      );
    }

    const response = await fetch(
      `${backendUrl}/super-admin/vendors/${vendorId}/service-areas`,
      {
        method: "PATCH",
        cache: "no-store",
        headers: {
          Accept:
            "application/json",
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          areas: body.areas,
        }),
      },
    );

    const payload =
      await safeJson(response);

    if (!response.ok) {
      return NextResponse.json(
        payload ?? {
          message:
            "Unable to update vendor service areas.",
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

    return NextResponse.json(
      payload,
    );
  } catch {
    return NextResponse.json(
      {
        message:
          "Vendor service is unavailable.",
      },
      {
        status: 502,
      },
    );
  }
}