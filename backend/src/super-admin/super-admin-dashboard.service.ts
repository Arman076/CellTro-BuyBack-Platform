import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";

import {
  PrismaService,
} from "../prisma/prisma/prisma.service.js";

@Injectable()
export class SuperAdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getDashboard(params: {
    from?: string;
    to?: string;
  }) {
    const { start, end } =
      this.resolveDateRange(
        params.from,
        params.to,
      );

    const enquiryCutoff =
      new Date(
        Date.now() -
          10 * 60 * 1000,
      );

    const inquiryUpperBound =
      enquiryCutoff < end
        ? enquiryCutoff
        : end;

    /*
     * Active device inquiry:
     * - exact quote has been viewed
     * - at least 10 minutes elapsed
     * - that device journey has no linked order
     *
     * We deliberately do NOT require quoteAmount != null here.
     * Missing data should remain visible as unavailable rather
     * than silently disappearing from the enquiry population.
     */
    const activeInquiryWhere =
      inquiryUpperBound > start
        ? {
            orderId: null,

            quoteViewedAt: {
              gte: start,
              lt: inquiryUpperBound,
            },
          }
        : {
            orderId: null,

            quoteViewedAt: {
              lt: new Date(0),
            },
          };

    const [
      groupedOrders,
      recentOrders,

      questionnaireCompleted,
      identityVerified,
      actualOtpVerified,
      quoteViewed,
      quoteConverted,
      completedQuoteJourneys,

      activeDeviceEnquiries,
      activeInquiryPhoneGroups,
      recentEnquiries,

      cancellationGroups,
    ] =
      await Promise.all([
        this.prisma.sellOrder.groupBy({
          by: [
            "status",
          ],

          where: {
            createdAt: {
              gte: start,
              lt: end,
            },
          },

          _count: {
            _all: true,
          },

          orderBy: {
            status:
              "asc",
          },
        }),

        this.prisma.sellOrder.findMany({
          where: {
            createdAt: {
              gte: start,
              lt: end,
            },
          },

          orderBy: {
            createdAt:
              "desc",
          },

          take: 10,

          select: {
            id: true,
            orderNumber: true,
            productName: true,
            status: true,
            finalPrice: true,
            createdAt: true,
          },
        }),

        /*
         * Funnel stages use their own first-event timestamps.
         */
        this.prisma.enquirySession.count({
          where: {
            questionnaireCompletedAt: {
              gte: start,
              lt: end,
            },
          },
        }),

        this.prisma.enquirySession.count({
          where: {
            identityVerifiedAt: {
              gte: start,
              lt: end,
            },
          },
        }),

        /*
         * Actual SMS OTP verification count.
         * Product 2 / 3 reached through the 24h trusted session
         * do not increase this number.
         */
        this.prisma.enquirySession.count({
          where: {
            otpVerifiedAt: {
              gte: start,
              lt: end,
            },
          },
        }),

        this.prisma.enquirySession.count({
          where: {
            quoteViewedAt: {
              gte: start,
              lt: end,
            },
          },
        }),

        /*
         * Quote -> Order conversion cohort is device-journey based.
         */
        this.prisma.enquirySession.count({
          where: {
            quoteViewedAt: {
              gte: start,
              lt: end,
            },

            orderId: {
              not: null,
            },
          },
        }),

        this.prisma.enquirySession.count({
          where: {
            quoteViewedAt: {
              gte: start,
              lt: end,
            },

            order: {
              is: {
                status:
                  "COMPLETED",
              },
            },
          },
        }),

        /*
         * Number of open device journeys.
         */
        this.prisma.enquirySession.count({
          where:
            activeInquiryWhere,
        }),

        /*
         * Number of unique customer mobiles with at least
         * one active device inquiry.
         */
        this.prisma.enquirySession.groupBy({
          by: [
            "phone",
          ],

          where:
            activeInquiryWhere,

          _count: {
            _all: true,
          },

          _max: {
            quoteViewedAt:
              true,
          },
        }),

        /*
         * Fetch recent device journeys, then group them by
         * customer mobile in the API response.
         *
         * Dashboard list is intentionally bounded; summary
         * counts above remain complete.
         */
        this.prisma.enquirySession.findMany({
          where:
            activeInquiryWhere,

          orderBy: {
            quoteViewedAt:
              "desc",
          },

          take: 200,

          select: {
            id: true,
            phone: true,
            quoteAmount: true,
            quoteViewedAt: true,
            identityVerifiedAt: true,

            product: {
              select: {
                name:
                  true,
              },
            },

            variant: {
              select: {
                values: {
                  select: {
                    attribute: {
                      select: {
                        name:
                          true,
                      },
                    },

                    option: {
                      select: {
                        value:
                          true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),

        /*
         * Cancellation cards are cancellation-event based.
         */
        this.prisma.orderCancellation.groupBy({
          by: [
            "actor",
          ],

          where: {
            createdAt: {
              gte: start,
              lt: end,
            },
          },

          _count: {
            _all: true,
          },
        }),
      ]);

    const statusCount =
      new Map(
        groupedOrders.map(
          (item) => [
            item.status,
            item._count._all,
          ],
        ),
      );

    const totalOrders =
      groupedOrders.reduce(
        (
          total,
          item,
        ) =>
          total +
          item._count._all,
        0,
      );

    const completedOrders =
      statusCount.get(
        "COMPLETED",
      ) ?? 0;

    const cancelledOrders =
      statusCount.get(
        "CANCELLED",
      ) ?? 0;

    const pendingOrders =
      Math.max(
        0,
        totalOrders -
          completedOrders -
          cancelledOrders,
      );

    const cancellationCount =
      new Map(
        cancellationGroups.map(
          (item) => [
            item.actor,
            item._count._all,
          ],
        ),
      );

    const customerCancelledOrders =
      cancellationCount.get(
        "CUSTOMER",
      ) ?? 0;

    const agentCancelledOrders =
      cancellationCount.get(
        "AGENT",
      ) ?? 0;

    /*
     * No denominator means "not available", not fabricated 0%.
     */
    const quoteConversionRate =
      quoteViewed > 0
        ? Number(
            (
              (
                quoteConverted /
                quoteViewed
              ) *
              100
            ).toFixed(
              2,
            ),
          )
        : null;

    const orderSuccessRate =
      totalOrders > 0
        ? Number(
            (
              (
                completedOrders /
                totalOrders
              ) *
              100
            ).toFixed(
              2,
            ),
          )
        : null;

    const enquiryRows =
      recentEnquiries.map(
        (
          enquiry,
        ) => {
          const variantLabel =
            enquiry.variant?.values
              .map(
                (
                  value,
                ) =>
                  `${value.attribute.name}: ${value.option.value}`,
              )
              .join(
                ", ",
              ) ?? "";

          const productName =
            enquiry.product
              ?.name ??
            null;

          const deviceName =
            [
              productName,
              variantLabel ||
                null,
            ]
              .filter(
                Boolean,
              )
              .join(
                " • ",
              ) ||
            null;

          return {
            id:
              enquiry.id,

            mobile:
              enquiry.phone,

            deviceName,

            quoteAmount:
              enquiry.quoteAmount ==
              null
                ? null
                : Number(
                    enquiry.quoteAmount,
                  ),

            quoteViewedAt:
              enquiry.quoteViewedAt
                ?.toISOString() ??
              null,

            identityVerifiedAt:
              enquiry.identityVerifiedAt
                ?.toISOString() ??
              null,

            orderPlaced:
              false,
          };
        },
      );

    /*
     * Keep each device as its own DB journey, but return one
     * customer group to the Super Admin UI.
     */
    const customerMap =
      new Map<
        string,
        {
          mobile: string;
          latestQuoteViewedAt:
            string | null;
          devices: typeof enquiryRows;
        }
      >();

    for (
      const enquiry of
      enquiryRows
    ) {
      const existing =
        customerMap.get(
          enquiry.mobile,
        );

      if (!existing) {
        customerMap.set(
          enquiry.mobile,
          {
            mobile:
              enquiry.mobile,

            latestQuoteViewedAt:
              enquiry.quoteViewedAt,

            devices: [
              enquiry,
            ],
          },
        );

        continue;
      }

      existing.devices.push(
        enquiry,
      );

      if (
        enquiry.quoteViewedAt &&
        (
          !existing.latestQuoteViewedAt ||
          enquiry.quoteViewedAt >
            existing.latestQuoteViewedAt
        )
      ) {
        existing.latestQuoteViewedAt =
          enquiry.quoteViewedAt;
      }
    }

    const inquiryCustomers =
      [
        ...customerMap.values(),
      ]
        .map(
          (
            customer,
          ) => ({
            mobile:
              customer.mobile,

            deviceCount:
              customer.devices.length,

            latestQuoteViewedAt:
              customer.latestQuoteViewedAt,

            devices:
              customer.devices,
          }),
        )
        .sort(
          (
            a,
            b,
          ) =>
            (
              b.latestQuoteViewedAt
                ? new Date(
                    b.latestQuoteViewedAt,
                  ).getTime()
                : 0
            ) -
            (
              a.latestQuoteViewedAt
                ? new Date(
                    a.latestQuoteViewedAt,
                  ).getTime()
                : 0
            ),
        )
        .slice(
          0,
          20,
        );

    const activeInquiryCustomers =
      activeInquiryPhoneGroups.length;

    return {
      summary: {
        /*
         * Existing property retained for compatibility.
         * It now represents grouped customer enquiries.
         */
        totalEnquiries:
          activeInquiryCustomers,

        activeInquiryCustomers,
        activeDeviceEnquiries,

        totalOrders,
        completedOrders,
        cancelledOrders,
        customerCancelledOrders,
        agentCancelledOrders,
        pendingOrders,

        enquiryConversionRate:
          quoteConversionRate,

        orderSuccessRate,

        /*
         * Device-level open quote journeys.
         */
        quoteViewedNoOrder:
          activeDeviceEnquiries,

        activeVendors:
          null,

        activeAgents:
          null,

        totalPayout:
          null,
      },

      funnel: {
        questionnaireCompleted,
        identityVerified,
        otpVerified:
          actualOtpVerified,
        quoteViewed,

        orderPlaced:
          quoteConverted,

        completed:
          completedQuoteJourneys,
      },

      trend: [],

      orderStatuses:
        groupedOrders.map(
          (
            item,
          ) => ({
            status:
              item.status,

            count:
              item._count._all,
          }),
        ),

      /*
       * Flat list retained temporarily for compatibility.
       */
      recentEnquiries:
        enquiryRows,

      /*
       * Preferred Super Admin representation.
       */
      inquiryCustomers,

      recentActivity:
        recentOrders.map(
          (
            order,
          ) => ({
            id:
              order.id,

            title:
              `Order ${order.orderNumber}`,

            description:
              `${order.productName} • ${this.formatStatus(
                order.status,
              )}`,

            createdAt:
              order.createdAt.toISOString(),

            type:
              "ORDER" as const,
          }),
        ),

      meta: {
        enquiryWaitMinutes:
          10,

        totalQuoteSessions:
          quoteViewed,

        quoteConverted,

        actualOtpVerified,

        activeInquiryCustomers,
        activeDeviceEnquiries,
      },
    };
  }

  private resolveDateRange(
    from?: string,
    to?: string,
  ) {
    const pattern =
      /^\d{4}-\d{2}-\d{2}$/;

    if (
      !from ||
      !to ||
      !pattern.test(
        from,
      ) ||
      !pattern.test(
        to,
      )
    ) {
      throw new BadRequestException(
        "from and to must be YYYY-MM-DD.",
      );
    }

    const start =
      new Date(
        `${from}T00:00:00+05:30`,
      );

    const inclusiveEnd =
      new Date(
        `${to}T00:00:00+05:30`,
      );

    if (
      Number.isNaN(
        start.getTime(),
      ) ||
      Number.isNaN(
        inclusiveEnd.getTime(),
      )
    ) {
      throw new BadRequestException(
        "Invalid dashboard date range.",
      );
    }

    if (
      start >
      inclusiveEnd
    ) {
      throw new BadRequestException(
        "from cannot be after to.",
      );
    }

    const end =
      new Date(
        inclusiveEnd.getTime() +
          24 *
            60 *
            60 *
            1000,
      );

    return {
      start,
      end,
    };
  }

  private formatStatus(
    value: string,
  ) {
    return value
      .toLowerCase()
      .split(
        "_",
      )
      .map(
        (
          part,
        ) =>
          part.charAt(
            0,
          )
            .toUpperCase() +
          part.slice(
            1,
          ),
      )
      .join(
        " ",
      );
  }
}
