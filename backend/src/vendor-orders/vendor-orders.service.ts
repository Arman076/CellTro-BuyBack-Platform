import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  SellOrderStatus,
} from "../generated/prisma/client.js";

import {
  PrismaService,
} from "../prisma/prisma/prisma.service.js";

type DateFilter =
  | "ALL"
  | "TODAY"
  | "YESTERDAY"
  | "LAST_7_DAYS"
  | "LAST_30_DAYS";

@Injectable()
export class VendorOrdersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private parsePositiveInt(
    value: unknown,
    fallback: number,
    max: number,
  ) {
    const parsed = Number.parseInt(
      String(value ?? ""),
      10,
    );

    if (
      !Number.isInteger(parsed) ||
      parsed <= 0
    ) {
      return fallback;
    }

    return Math.min(parsed, max);
  }

  private normalizeSearch(value: unknown) {
    return String(value ?? "")
      .trim()
      .slice(0, 100);
  }

  private parseStatus(
    value: unknown,
  ): SellOrderStatus | undefined {
    const raw = String(value ?? "")
      .trim()
      .toUpperCase();

    if (!raw || raw === "ALL") {
      return undefined;
    }

    const allowed = Object.values(
      SellOrderStatus,
    ) as string[];

    if (!allowed.includes(raw)) {
      throw new BadRequestException(
        "Invalid order status.",
      );
    }

    return raw as SellOrderStatus;
  }

  private parseDateFilter(
    value: unknown,
  ): DateFilter {
    const raw = String(value ?? "ALL")
      .trim()
      .toUpperCase();

    const allowed: DateFilter[] = [
      "ALL",
      "TODAY",
      "YESTERDAY",
      "LAST_7_DAYS",
      "LAST_30_DAYS",
    ];

    if (
      !allowed.includes(
        raw as DateFilter,
      )
    ) {
      throw new BadRequestException(
        "Invalid date filter.",
      );
    }

    return raw as DateFilter;
  }

  /*
   * Vendor operational date filter.
   *
   * Filter is based on the CURRENT active
   * vendor assignment assignedAt timestamp,
   * not customer order creation time.
   *
   * India timezone boundaries are converted
   * to UTC because DB timestamps are UTC.
   */
  private getAssignmentDateRange(
    filter: DateFilter,
  ) {
    if (filter === "ALL") {
      return null;
    }

    const now = new Date();

    const indiaParts =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone: "Asia/Kolkata",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        },
      ).formatToParts(now);

    const year = Number(
      indiaParts.find(
        (part) => part.type === "year",
      )?.value,
    );

    const month = Number(
      indiaParts.find(
        (part) => part.type === "month",
      )?.value,
    );

    const day = Number(
      indiaParts.find(
        (part) => part.type === "day",
      )?.value,
    );

    /*
     * IST = UTC +05:30.
     * Therefore IST midnight in UTC is
     * previous date 18:30 UTC.
     */
    const todayStart = new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        -5,
        -30,
        0,
        0,
      ),
    );

    const tomorrowStart = new Date(
      todayStart.getTime() +
        24 * 60 * 60 * 1000,
    );

    if (filter === "TODAY") {
      return {
        gte: todayStart,
        lt: tomorrowStart,
      };
    }

    if (filter === "YESTERDAY") {
      return {
        gte: new Date(
          todayStart.getTime() -
            24 * 60 * 60 * 1000,
        ),
        lt: todayStart,
      };
    }

    if (filter === "LAST_7_DAYS") {
      return {
        gte: new Date(
          todayStart.getTime() -
            6 * 24 * 60 * 60 * 1000,
        ),
        lt: tomorrowStart,
      };
    }

    return {
      gte: new Date(
        todayStart.getTime() -
          29 * 24 * 60 * 60 * 1000,
      ),
      lt: tomorrowStart,
    };
  }

  private buildCurrentAssignmentFilter(
    vendorId: number,
    dateFilter: DateFilter,
  ) {
    const range =
      this.getAssignmentDateRange(
        dateFilter,
      );

    if (!range) {
      return undefined;
    }

    return {
      some: {
        vendorId,
        unassignedAt: null,
        assignedAt: range,
      },
    };
  }

  async listOrders(
    vendorId: number,
    query: {
      search?: unknown;
      status?: unknown;
      dateFilter?: unknown;
      page?: unknown;
      limit?: unknown;
    },
  ) {
    const page =
      this.parsePositiveInt(
        query.page,
        1,
        1000000,
      );

    const limit =
      this.parsePositiveInt(
        query.limit,
        20,
        50,
      );

    const skip =
      (page - 1) * limit;

    const search =
      this.normalizeSearch(
        query.search,
      );

    const status =
      this.parseStatus(
        query.status,
      );

    const dateFilter =
      this.parseDateFilter(
        query.dateFilter,
      );

    const assignmentFilter =
      this.buildCurrentAssignmentFilter(
        vendorId,
        dateFilter,
      );

    const where = {
      currentVendorId: vendorId,

      ...(status
        ? { status }
        : {}),

      ...(assignmentFilter
        ? {
            vendorAssignments:
              assignmentFilter,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                orderNumber: {
                  contains: search,
                  mode:
                    "insensitive" as const,
                },
              },
              {
                productName: {
                  contains: search,
                  mode:
                    "insensitive" as const,
                },
              },
              {
                variantLabel: {
                  contains: search,
                  mode:
                    "insensitive" as const,
                },
              },
              {
                addressSnapshot: {
                  is: {
                    fullName: {
                      contains: search,
                      mode:
                        "insensitive" as const,
                    },
                  },
                },
              },
              {
                addressSnapshot: {
                  is: {
                    phone: {
                      contains: search,
                    },
                  },
                },
              },
              {
                addressSnapshot: {
                  is: {
                    pincode: {
                      contains: search,
                    },
                  },
                },
              },
              {
                addressSnapshot: {
                  is: {
                    city: {
                      contains: search,
                      mode:
                        "insensitive" as const,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [rows, total] =
      await this.prisma.$transaction([
        this.prisma.sellOrder.findMany({
          where,

          skip,
          take: limit,

          /*
           * Operational vendor view:
           * latest assignment first.
           *
           * createdAt remains available
           * as order creation history.
           */
          orderBy: [
            {
              updatedAt: "desc",
            },
            {
              id: "desc",
            },
          ],

          select: {
            id: true,
            orderNumber: true,

            productName: true,
            productImage: true,
            variantLabel: true,

            finalPrice: true,

            status: true,

            pickupDate: true,

            createdAt: true,
            updatedAt: true,

            pickupSlot: {
              select: {
                code: true,
                label: true,
                startTime: true,
                endTime: true,
              },
            },

            addressSnapshot: {
              select: {
                fullName: true,
                phone: true,
                locality: true,
                pincode: true,
                city: true,
                state: true,
              },
            },

            vendorAssignments: {
              where: {
                vendorId,
                unassignedAt: null,
              },

              orderBy: {
                assignedAt: "desc",
              },

              take: 1,

              select: {
                id: true,
                source: true,
                reason: true,
                assignedAt: true,
              },
            },
          },
        }),

        this.prisma.sellOrder.count({
          where,
        }),
      ]);

    return {
      data: rows.map((row) => ({
        id: row.id,

        orderNumber:
          row.orderNumber,

        productName:
          row.productName,

        productImage:
          row.productImage,

        variantLabel:
          row.variantLabel,

        finalPrice:
          row.finalPrice,

        status:
          row.status,

        pickupDate:
          row.pickupDate,

        pickupSlot:
          row.pickupSlot,

        customer:
          row.addressSnapshot
            ? {
                name:
                  row.addressSnapshot
                    .fullName,

                phone:
                  row.addressSnapshot
                    .phone,
              }
            : null,

        location:
          row.addressSnapshot
            ? {
                locality:
                  row.addressSnapshot
                    .locality,

                city:
                  row.addressSnapshot
                    .city,

                state:
                  row.addressSnapshot
                    .state,

                pincode:
                  row.addressSnapshot
                    .pincode,
              }
            : null,

        assignment:
          row.vendorAssignments[0] ??
          null,

        createdAt:
          row.createdAt,

        updatedAt:
          row.updatedAt,
      })),

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(total / limit),
      },

      filters: {
        dateFilter,
        status: status ?? "ALL",
        search,
      },
    };
  }

  async getOrder(
    vendorId: number,
    orderNumberInput: unknown,
  ) {
    const orderNumber = String(
      orderNumberInput ?? "",
    )
      .trim()
      .slice(0, 100);

    if (!orderNumber) {
      throw new BadRequestException(
        "Order number is required.",
      );
    }

    /*
     * SECURITY:
     * Vendor can only open an order which
     * is CURRENTLY assigned to that vendor.
     */
    const order =
      await this.prisma.sellOrder.findFirst({
        where: {
          orderNumber,
          currentVendorId: vendorId,
        },

        select: {
          id: true,
          orderNumber: true,

          productId: true,
          variantId: true,

          productName: true,
          productImage: true,
          variantLabel: true,

          basePrice: true,
          totalDeduction: true,
          finalPrice: true,

          questionnaireSnapshot:
            true,

          status: true,

          pickupDate: true,

          payoutMethod: true,
          payoutUpiMobile: true,

          createdAt: true,
          updatedAt: true,

          pickupSlot: {
            select: {
              code: true,
              label: true,
              startTime: true,
              endTime: true,
            },
          },

          addressSnapshot: {
            select: {
              fullName: true,
              phone: true,

              house: true,
              street: true,
              locality: true,
              landmark: true,

              pincode: true,
              city: true,
              state: true,
              type: true,
            },
          },

          statusHistory: {
            orderBy: {
              createdAt: "asc",
            },

            select: {
              id: true,
              status: true,
              note: true,
              createdAt: true,
            },
          },

          reschedules: {
            orderBy: {
              createdAt: "desc",
            },

            select: {
              id: true,

              oldPickupDate: true,
              newPickupDate: true,

              oldSlotLabel: true,
              newSlotLabel: true,

              createdAt: true,
            },
          },

          vendorAssignments: {
            where: {
              vendorId,
            },

            orderBy: {
              assignedAt: "desc",
            },

            select: {
              id: true,

              source: true,
              reason: true,

              assignedAt: true,

              unassignedAt: true,

              unassignmentReason:
                true,
            },
          },
        },
      });

    if (!order) {
      throw new NotFoundException(
        "Order not found.",
      );
    }

    return {
      id: order.id,

      orderNumber:
        order.orderNumber,

      product: {
        id: order.productId,
        variantId: order.variantId,

        name: order.productName,
        image: order.productImage,
        variant: order.variantLabel,
      },

      /*
       * Customer-side quote snapshot.
       *
       * Never recalculate these values in
       * vendor frontend.
       */
      pricing: {
        basePrice:
          order.basePrice,

        totalDeduction:
          order.totalDeduction,

        finalPrice:
          order.finalPrice,
      },

      /*
       * Frozen customer questionnaire
       * from order creation.
       */
      questionnaire:
        order.questionnaireSnapshot,

      status:
        order.status,

      pickup: {
        date:
          order.pickupDate,

        slot:
          order.pickupSlot,
      },

      payout: {
        method:
          order.payoutMethod,

        upiMobile:
          order.payoutUpiMobile,
      },

      customer:
        order.addressSnapshot
          ? {
              name:
                order.addressSnapshot
                  .fullName,

              phone:
                order.addressSnapshot
                  .phone,
            }
          : null,

      address:
        order.addressSnapshot,

      statusHistory:
        order.statusHistory,

      reschedules:
        order.reschedules,

      assignmentHistory:
        order.vendorAssignments,

      /*
       * Agent module is intentionally
       * not fabricated here.
       *
       * Later this response will contain
       * agentAssignment + inspections +
       * requotes from real DB records.
       */
      agent: null,

      createdAt:
        order.createdAt,

      updatedAt:
        order.updatedAt,
    };
  }

  async getDashboard(
    vendorId: number,
    query: {
      dateFilter?: unknown;
    } = {},
  ) {
    const dateFilter =
      this.parseDateFilter(
        query.dateFilter,
      );

    const assignmentFilter =
      this.buildCurrentAssignmentFilter(
        vendorId,
        dateFilter,
      );

    const where = {
      currentVendorId: vendorId,

      ...(assignmentFilter
        ? {
            vendorAssignments:
              assignmentFilter,
          }
        : {}),
    };

    const [
      groupedStatuses,
      totalAssigned,
      recentOrders,
    ] =
      await this.prisma.$transaction([
        this.prisma.sellOrder.groupBy({
          by: ["status"],

          where,

          _count: {
            _all: true,
          },
        }),

        this.prisma.sellOrder.count({
          where,
        }),

        this.prisma.sellOrder.findMany({
          where,

          take: 5,

          orderBy: [
            {
              updatedAt: "desc",
            },
            {
              id: "desc",
            },
          ],

          select: {
            id: true,
            orderNumber: true,

            productName: true,
            productImage: true,
            variantLabel: true,

            finalPrice: true,

            status: true,
            pickupDate: true,

            createdAt: true,

            addressSnapshot: {
              select: {
                fullName: true,
                pincode: true,
                city: true,
              },
            },

            vendorAssignments: {
              where: {
                vendorId,
                unassignedAt: null,
              },

              orderBy: {
                assignedAt: "desc",
              },

              take: 1,

              select: {
                assignedAt: true,
              },
            },
          },
        }),
      ]);

    const statusCounts =
      Object.fromEntries(
        groupedStatuses.map(
          (row) => [
            row.status,
            row._count._all,
          ],
        ),
      );

    return {
      dateFilter,

      totalAssigned,

      statusCounts,

      recentOrders:
        recentOrders.map(
          (order) => ({
            id: order.id,

            orderNumber:
              order.orderNumber,

            productName:
              order.productName,

            productImage:
              order.productImage,

            variantLabel:
              order.variantLabel,

            finalPrice:
              order.finalPrice,

            status:
              order.status,

            pickupDate:
              order.pickupDate,

            customerName:
              order.addressSnapshot
                ?.fullName ??
              null,

            location:
              order.addressSnapshot
                ? {
                    city:
                      order.addressSnapshot
                        .city,

                    pincode:
                      order.addressSnapshot
                        .pincode,
                  }
                : null,

            assignedAt:
              order.vendorAssignments[0]
                ?.assignedAt ??
              null,

            createdAt:
              order.createdAt,
          }),
        ),
    };
  }
}