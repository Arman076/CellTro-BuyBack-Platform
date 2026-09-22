const API_URL =
  process.env
    .NEXT_PUBLIC_API_URL ??
  "http://localhost:4000";

interface ApiErrorResponse {
  message?:
    | string
    | string[];

  error?: string;
}

export class VendorApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);

    this.name =
      "VendorApiError";
  }
}

export async function vendorApi<
  T = unknown,
>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers =
    new Headers(
      options.headers,
    );

  if (
    options.body &&
    !headers.has(
      "Content-Type",
    )
  ) {
    headers.set(
      "Content-Type",
      "application/json",
    );
  }

  const response =
    await fetch(
      `${API_URL}${path}`,
      {
        ...options,

        headers,

        /*
         * REQUIRED FOR
         * HttpOnly session cookies.
         */
        credentials:
          "include",
      },
    );

  const contentType =
    response.headers.get(
      "content-type",
    );

  let data: unknown = null;

  if (
    contentType?.includes(
      "application/json",
    )
  ) {
    data =
      await response.json();
  }

  if (!response.ok) {
    const errorData =
      data as
        | ApiErrorResponse
        | null;

    let message =
      `Request failed (${response.status})`;

    if (
      Array.isArray(
        errorData?.message,
      )
    ) {
      message =
        errorData.message.join(
          ", ",
        );
    } else if (
      typeof errorData?.message ===
      "string"
    ) {
      message =
        errorData.message;
    } else if (
      typeof errorData?.error ===
      "string"
    ) {
      message =
        errorData.error;
    }

    throw new VendorApiError(
      message,
      response.status,
    );
  }

  return data as T;
}