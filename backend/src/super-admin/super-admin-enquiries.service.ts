import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  PrismaService,
} from "../prisma/prisma/prisma.service.js";

type GetEnquiriesInput = {
  search?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
};

const ENQUIRY_DELAY_MINUTES = 10;

@Injectable()
export class SuperAdminEnquiriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private positiveInteger(
    value: unknown,
    fallback: number,
    maximum: number,
  ) {
    const parsed = Number.parseInt(
      String(value ?? ""),
      10,
    );

    if (
      !Number.isFinite(parsed) ||
      parsed <= 0
    ) {
      return fallback;
    }

    return Math.min(parsed, maximum);
  }

  private parseDate(
    value: string,
    fieldName: string,
  ) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value)
    ) {
      throw new BadRequestException(
        `${fieldName} date must be YYYY-MM-DD.`,
      );
    }

    const date = new Date(
      `${value}T00:00:00.000Z`,
    );

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        `${fieldName} date is invalid.`,
      );
    }

    return date;
  }

  private nextUtcDay(
    value: Date,
  ) {
    const next = new Date(value);

    next.setUTCDate(
      next.getUTCDate() + 1,
    );

    return next;
  }

  private activeInquiryUpperBound() {
    return new Date(
      Date.now() -
        ENQUIRY_DELAY_MINUTES *
          60 *
          1000,
    );
  }

  private money(
    value: unknown,
  ): number | null {
    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  }

  private variantLabel(
    variant:
      | {
          values: Array<{
            attribute: {
              name: string;
            };
            option: {
              value: string;
            };
          }>;
        }
      | null,
  ) {
    if (!variant) {
      return null;
    }

    const parts = variant.values
      .map((item) => {
        const value = String(
          item.option?.value ?? "",
        ).trim();

        return value || null;
      })
      .filter(
        (
          value,
        ): value is string =>
          Boolean(value),
      );

    return parts.length
      ? parts.join(" / ")
      : null;
  }

  async getEnquiries(
    input: GetEnquiriesInput = {},
  ) {
    const page =
      this.positiveInteger(
        input.page,
        1,
        1_000_000,
      );

    const limit =
      this.positiveInteger(
        input.limit,
        20,
        100,
      );

    const search = String(
      input.search ?? "",
    )
      .trim()
      .slice(0, 100);

    const from = String(
      input.from ?? "",
    ).trim();

    const to = String(
      input.to ?? "",
    ).trim();

    let fromDate:
      | Date
      | undefined;

    let toExclusive:
      | Date
      | undefined;

    if (from) {
      fromDate = this.parseDate(
        from,
        "From",
      );
    }

    if (to) {
      toExclusive = this.nextUtcDay(
        this.parseDate(
          to,
          "To",
        ),
      );
    }

    if (
      fromDate &&
      toExclusive &&
      fromDate >= toExclusive
    ) {
      throw new BadRequestException(
        "From date cannot be after To date.",
      );
    }

    const inquiryUpperBound =
      this.activeInquiryUpperBound();

    const where: any = {
      orderId: null,

      quoteViewedAt: {
        lte: inquiryUpperBound,
      },
    };

    /*
     * Date filters apply to the business event
     * that creates the enquiry: quoteViewedAt.
     *
     * This is intentionally NOT createdAt.
     */
    if (fromDate) {
      where.quoteViewedAt.gte =
        fromDate;
    }

    if (toExclusive) {
      where.quoteViewedAt.lt =
        toExclusive;
    }

    if (search) {
      const searchFilters: any[] = [
        {
          phone: {
            contains: search,
          },
        },

        {
          sessionId: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          product: {
            is: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
      ];

      /*
       * ProductVariant itself does not store the
       * human-readable composite label. Its label
       * comes from attribute-option values.
       */
      searchFilters.push({
        variant: {
          is: {
            values: {
              some: {
                option: {
                  value: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
          },
        },
      });

      where.AND = [
        {
          OR: searchFilters,
        },
      ];
    }

    const skip =
      (page - 1) * limit;

    const [
      enquiries,
      total,
    ] =
      await this.prisma.$transaction([
        this.prisma.enquirySession.findMany({
          where,

          skip,
          take: limit,

          orderBy: [
            {
              quoteViewedAt: "desc",
            },
            {
              id: "desc",
            },
          ],

          select: {
            id: true,
            sessionId: true,
            phone: true,

            productId: true,
            variantId: true,

            quoteAmount: true,
            quoteViewedAt: true,

            questionnaireCompletedAt:
              true,

            otpSentAt: true,
            otpVerifiedAt: true,

            identityVerifiedAt: true,

            createdAt: true,
            updatedAt: true,

            product: {
              select: {
                id: true,
                name: true,
              },
            },

            variant: {
              select: {
                id: true,

                values: {
                  select: {
                    attribute: {
                      select: {
                        name: true,
                      },
                    },

                    option: {
                      select: {
                        value: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),

        this.prisma.enquirySession.count({
          where,
        }),
      ]);

    return {
      data: enquiries.map(
        (enquiry) => ({
          id: enquiry.id,

          sessionId:
            enquiry.sessionId,

          phone:
            enquiry.phone,

          productId:
            enquiry.productId,

          productName:
            enquiry.product?.name ??
            null,

          variantId:
            enquiry.variantId,

          variantLabel:
            this.variantLabel(
              enquiry.variant,
            ),

          quoteAmount:
            this.money(
              enquiry.quoteAmount,
            ),

          quoteViewedAt:
            enquiry.quoteViewedAt,

          questionnaireCompletedAt:
            enquiry.questionnaireCompletedAt,

          otpSentAt:
            enquiry.otpSentAt,

          otpVerifiedAt:
            enquiry.otpVerifiedAt,

          identityVerifiedAt:
            enquiry.identityVerifiedAt,

          createdAt:
            enquiry.createdAt,

          updatedAt:
            enquiry.updatedAt,
        }),
      ),

      pagination: {
        page,
        limit,
        total,

        totalPages: Math.max(
          1,
          Math.ceil(
            total / limit,
          ),
        ),
      },

      definition: {
        abandonmentMinutes:
          ENQUIRY_DELAY_MINUTES,
      },
    };
  }

  async getEnquiryDetails(
    id: string,
  ) {
    const enquiryId =
      String(id ?? "")
        .trim()
        .slice(0, 100);

    if (!enquiryId) {
      throw new BadRequestException(
        "Enquiry ID is required.",
      );
    }

    const inquiryUpperBound =
      this.activeInquiryUpperBound();

    /*
     * Detail endpoint is intentionally scoped to
     * ACTIVE enquiries as well.
     *
     * A converted enquiry must not remain accessible
     * as though it were still abandoned.
     */
    const enquiry =
      await this.prisma.enquirySession.findFirst({
        where: {
          id: enquiryId,

          orderId: null,

          quoteViewedAt: {
            lte: inquiryUpperBound,
          },
        },

        select: {
          id: true,
          sessionId: true,
          phone: true,

          productId: true,
          variantId: true,

          questionnaireCompletedAt:
            true,

          otpSentAt: true,
          otpVerifiedAt: true,
          identityVerifiedAt: true,

          quoteViewedAt: true,
          quoteAmount: true,

          questionnaireSnapshot:
            true,

          createdAt: true,
          updatedAt: true,

          product: {
            select: {
              id: true,
              name: true,
            },
          },

          variant: {
            select: {
              id: true,

              values: {
                select: {
                  attribute: {
                    select: {
                      name: true,
                    },
                  },

                  option: {
                    select: {
                      value: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!enquiry) {
      throw new NotFoundException(
        "Active enquiry not found.",
      );
    }

    return {
      id: enquiry.id,

      sessionId:
        enquiry.sessionId,

      phone:
        enquiry.phone,

      productId:
        enquiry.productId,

      productName:
        enquiry.product?.name ??
        null,

      variantId:
        enquiry.variantId,

      variantLabel:
        this.variantLabel(
          enquiry.variant,
        ),

      quoteAmount:
        this.money(
          enquiry.quoteAmount,
        ),

      questionnaireCompletedAt:
        enquiry.questionnaireCompletedAt,

      otpSentAt:
        enquiry.otpSentAt,

      otpVerifiedAt:
        enquiry.otpVerifiedAt,

      identityVerifiedAt:
        enquiry.identityVerifiedAt,

      quoteViewedAt:
        enquiry.quoteViewedAt,

      /*
       * Keep the original snapshot intact.
       * We are not mutating historical customer
       * answers from the Super Admin read API.
       *
       * In the frontend phase we can resolve this
       * into readable question/answer labels using
       * the same safe approach used for Orders.
       */
      questionnaireSnapshot:
        enquiry.questionnaireSnapshot,

      createdAt:
        enquiry.createdAt,

      updatedAt:
        enquiry.updatedAt,

      status:
        "ACTIVE_ENQUIRY",

      abandonmentMinutes:
        ENQUIRY_DELAY_MINUTES,
    };
  }
}