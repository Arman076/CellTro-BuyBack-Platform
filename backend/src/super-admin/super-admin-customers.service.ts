import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  PrismaService,
} from "../prisma/prisma/prisma.service.js";

type GetCustomersInput = {
  search?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
};

@Injectable()
export class SuperAdminCustomersService {
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

  private nextUtcDay(value: Date) {
    const next = new Date(value);

    next.setUTCDate(
      next.getUTCDate() + 1,
    );

    return next;
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

    const parsed = Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  async getCustomers(
    input: GetCustomersInput = {},
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

    const where: any = {};

    if (search) {
      where.OR = [
        {
          phone: {
            contains: search,
          },
        },

        {
          addresses: {
            some: {
              fullName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },

        {
          orders: {
            some: {
              orderNumber: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },

        {
          orders: {
            some: {
              productName: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }

    if (
      fromDate ||
      toExclusive
    ) {
      where.createdAt = {};

      if (fromDate) {
        where.createdAt.gte =
          fromDate;
      }

      if (toExclusive) {
        where.createdAt.lt =
          toExclusive;
      }
    }

    const skip =
      (page - 1) * limit;

    const [
      customers,
      total,
    ] =
      await this.prisma.$transaction([
        this.prisma.customer.findMany({
          where,

          skip,
          take: limit,

          orderBy: [
            {
              createdAt: "desc",
            },
            {
              id: "desc",
            },
          ],

          select: {
            id: true,
            phone: true,
            createdAt: true,
            updatedAt: true,

            addresses: {
              where: {
                isActive: true,
              },

              orderBy: {
                updatedAt: "desc",
              },

              take: 1,

              select: {
                fullName: true,
              },
            },

            orders: {
              orderBy: {
                createdAt: "desc",
              },

              select: {
                id: true,
                orderNumber: true,
                productName: true,
                variantLabel: true,
                finalPrice: true,
                status: true,
                createdAt: true,
              },
            },
          },
        }),

        this.prisma.customer.count({
          where,
        }),
      ]);

    return {
      data: customers.map(
        (customer) => {
          const totalOrders =
            customer.orders.length;

          const completedOrders =
            customer.orders.filter(
              (order) =>
                order.status ===
                "COMPLETED",
            ).length;

          const cancelledOrders =
            customer.orders.filter(
              (order) =>
                order.status ===
                "CANCELLED",
            ).length;

          const latestOrder =
            customer.orders[0] ??
            null;

          return {
            id: customer.id,

            name:
              customer.addresses[0]
                ?.fullName ?? null,

            phone:
              customer.phone,

            totalOrders,

            completedOrders,

            cancelledOrders,

            latestOrder:
              latestOrder
                ? {
                    orderNumber:
                      latestOrder.orderNumber,

                    productName:
                      latestOrder.productName,

                    variantLabel:
                      latestOrder.variantLabel,

                    finalPrice:
                      this.money(
                        latestOrder.finalPrice,
                      ),

                    status:
                      latestOrder.status,

                    createdAt:
                      latestOrder.createdAt,
                  }
                : null,

            createdAt:
              customer.createdAt,

            updatedAt:
              customer.updatedAt,
          };
        },
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
    };
  }

  async getCustomerDetails(
    rawId: string,
  ) {
    const customerId =
      Number.parseInt(
        String(rawId ?? ""),
        10,
      );

    if (
      !Number.isInteger(
        customerId,
      ) ||
      customerId <= 0
    ) {
      throw new BadRequestException(
        "Customer ID is invalid.",
      );
    }

    const customer =
      await this.prisma.customer.findUnique({
        where: {
          id: customerId,
        },

        select: {
          id: true,
          phone: true,
          createdAt: true,
          updatedAt: true,

          addresses: {
            where: {
              isActive: true,
            },

            orderBy: {
              updatedAt: "desc",
            },

            select: {
              id: true,
              fullName: true,
              house: true,
              street: true,
              locality: true,
              landmark: true,
              pincode: true,
              city: true,
              state: true,
              type: true,
              createdAt: true,
              updatedAt: true,
            },
          },

          orders: {
            orderBy: {
              createdAt: "desc",
            },

            select: {
              id: true,
              orderNumber: true,
              productName: true,
              productImage: true,
              variantLabel: true,
              basePrice: true,
              totalDeduction: true,
              finalPrice: true,
              status: true,
              payoutMethod: true,
              pickupDate: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      });

    if (!customer) {
      throw new NotFoundException(
        "Customer not found.",
      );
    }

    const completedOrders =
      customer.orders.filter(
        (order) =>
          order.status ===
          "COMPLETED",
      ).length;

    const cancelledOrders =
      customer.orders.filter(
        (order) =>
          order.status ===
          "CANCELLED",
      ).length;

    return {
      id: customer.id,

      name:
        customer.addresses[0]
          ?.fullName ?? null,

      phone:
        customer.phone,

      createdAt:
        customer.createdAt,

      updatedAt:
        customer.updatedAt,

      summary: {
        totalOrders:
          customer.orders.length,

        completedOrders,

        cancelledOrders,
      },

      addresses:
        customer.addresses,

      orders:
        customer.orders.map(
          (order) => ({
            ...order,

            basePrice:
              this.money(
                order.basePrice,
              ),

            totalDeduction:
              this.money(
                order.totalDeduction,
              ),

            finalPrice:
              this.money(
                order.finalPrice,
              ),
          }),
        ),
    };
  }
}