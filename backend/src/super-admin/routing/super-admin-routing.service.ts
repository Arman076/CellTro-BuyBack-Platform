import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  OrderVendorAssignmentReason,
  OrderVendorAssignmentSource,
  OrderVendorUnassignmentReason,
  SellOrderStatus,
  VendorStatus,
} from "../../generated/prisma/enums.js";

import {
  PrismaService,
} from "../../prisma/prisma/prisma.service.js";

import type {
  Prisma,
} from "../../generated/prisma/client.js";

const REROUTABLE_STATUSES =
  new Set<SellOrderStatus>([
    SellOrderStatus.PICKUP_REQUESTED,
    SellOrderStatus.PICKUP_CONFIRMED,
  ]);

type OrderRoutingActionInput = {
  vendorId?: unknown;
};

@Injectable()
export class SuperAdminRoutingService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private parsePositiveInt(
    value: unknown,
    fieldName: string,
  ) {
    const parsed = Number(value);

    if (
      !Number.isInteger(parsed) ||
      parsed <= 0
    ) {
      throw new BadRequestException(
        `Invalid ${fieldName}.`,
      );
    }

    return parsed;
  }

  private parsePagination(
    pageInput: unknown,
    limitInput: unknown,
  ) {
    const page = Math.max(
      1,
      Number(pageInput) || 1,
    );

    const requestedLimit =
      Number(limitInput) || 20;

    const limit = Math.min(
      100,
      Math.max(1, requestedLimit),
    );

    return {
      page,
      limit,
      skip:
        (page - 1) * limit,
    };
  }

  private normalizeSearch(
    value: unknown,
  ) {
    return String(value ?? "")
      .trim()
      .slice(0, 100);
  }

  private parseAssignmentFilter(
    value: unknown,
  ) {
    const normalized =
      String(value ?? "ALL")
        .trim()
        .toUpperCase();

    if (
      ![
        "ALL",
        "ASSIGNED",
        "UNASSIGNED",
      ].includes(normalized)
    ) {
      throw new BadRequestException(
        "Invalid assignment filter.",
      );
    }

    return normalized as
      | "ALL"
      | "ASSIGNED"
      | "UNASSIGNED";
  }

  private async lockOrder(
    // tx: Parameters<
    //   Parameters<
        // PrismaService["$transaction"]
    //   >[0]
    // >[0],
    tx: Prisma.TransactionClient,
    orderId: string,
  ) {
    await tx.$queryRaw<
      Array<{
        lock_result: string | null;
      }>
    >`
      SELECT pg_advisory_xact_lock(
        hashtext(${`celltro-order-routing:${orderId}`})
      )::text AS lock_result
    `;
  }

  async summary() {
    const [
      serviceablePincodes,
      coveredPincodes,
      assignedOrders,
      unassignedOrders,
    ] = await this.prisma.$transaction([
      this.prisma.serviceablePincode.count({
        where: {
          isActive: true,
        },
      }),

      this.prisma.serviceablePincode.count({
        where: {
          isActive: true,

          vendorMappings: {
            some: {
              isActive: true,

              vendor: {
                status:
                  VendorStatus.ACTIVE,
              },
            },
          },
        },
      }),

      this.prisma.sellOrder.count({
        where: {
          currentVendorId: {
            not: null,
          },

          status: {
            notIn: [
              SellOrderStatus.COMPLETED,
              SellOrderStatus.CANCELLED,
            ],
          },
        },
      }),

      this.prisma.sellOrder.count({
        where: {
          currentVendorId: null,

          status: {
            notIn: [
              SellOrderStatus.COMPLETED,
              SellOrderStatus.CANCELLED,
            ],
          },
        },
      }),
    ]);

    return {
      serviceablePincodes,
      coveredPincodes,

      uncoveredPincodes:
        Math.max(
          0,
          serviceablePincodes -
            coveredPincodes,
        ),

      assignedOpenOrders:
        assignedOrders,

      unassignedOpenOrders:
        unassignedOrders,
    };
  }

  async listServiceAreas(
    query: {
      search?: unknown;
      coverage?: unknown;
      page?: unknown;
      limit?: unknown;
    },
  ) {
    const {
      page,
      limit,
      skip,
    } = this.parsePagination(
      query.page,
      query.limit,
    );

    const search =
      this.normalizeSearch(
        query.search,
      );

    const coverage =
      String(query.coverage ?? "ALL")
        .trim()
        .toUpperCase();

    if (
      ![
        "ALL",
        "COVERED",
        "UNCOVERED",
      ].includes(coverage)
    ) {
      throw new BadRequestException(
        "Invalid coverage filter.",
      );
    }

    const activeVendorMappingWhere = {
      isActive: true,

      vendor: {
        status:
          VendorStatus.ACTIVE,
      },
    };

    const where = {
      isActive: true,

      ...(search
        ? {
            OR: [
              {
                pincode: {
                  contains: search,
                },
              },
              {
                district: {
                  contains: search,
                  mode:
                    "insensitive" as const,
                },
              },
              {
                state: {
                  contains: search,
                  mode:
                    "insensitive" as const,
                },
              },
            ],
          }
        : {}),

      ...(coverage === "COVERED"
        ? {
            vendorMappings: {
              some:
                activeVendorMappingWhere,
            },
          }
        : {}),

      ...(coverage === "UNCOVERED"
        ? {
            vendorMappings: {
              none:
                activeVendorMappingWhere,
            },
          }
        : {}),
    };

    const [
      rows,
      total,
    ] = await this.prisma.$transaction([
      this.prisma.serviceablePincode
        .findMany({
          where,

          skip,
          take: limit,

          orderBy: {
            pincode: "asc",
          },

          select: {
            id: true,
            pincode: true,
            district: true,
            state: true,
            isActive: true,

            vendorMappings: {
              where:
                activeVendorMappingWhere,

              orderBy: [
                {
                  priority: "asc",
                },
                {
                  vendorId: "asc",
                },
              ],

              select: {
                id: true,
                priority: true,

                vendor: {
                  select: {
                    id: true,
                    vendorCode: true,
                    businessName: true,
                    status: true,
                  },
                },
              },
            },
          },
        }),

      this.prisma.serviceablePincode
        .count({
          where,
        }),
    ]);

    return {
      data:
        rows.map((row) => ({
          id: row.id,
          pincode: row.pincode,
          district: row.district,
          state: row.state,
          isActive: row.isActive,

          coverageCount:
            row.vendorMappings.length,

          coverage:
            row.vendorMappings.length === 0
              ? "NO_COVERAGE"
              : row.vendorMappings.length === 1
                ? "SINGLE_COVERAGE"
                : "MULTI_COVERAGE",

          vendors:
            row.vendorMappings.map(
              (mapping) => ({
                mappingId:
                  mapping.id,

                priority:
                  mapping.priority,

                ...mapping.vendor,
              }),
            ),
        })),

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(total / limit),
      },
    };
  }

  async getServiceAreaVendors(
    pincodeIdInput: unknown,
  ) {
    const pincodeId =
      this.parsePositiveInt(
        pincodeIdInput,
        "pincode id",
      );

    const area =
      await this.prisma
        .serviceablePincode
        .findUnique({
          where: {
            id: pincodeId,
          },

          select: {
            id: true,
            pincode: true,
            district: true,
            state: true,
            isActive: true,

            vendorMappings: {
              orderBy: [
                {
                  isActive: "desc",
                },
                {
                  priority: "asc",
                },
                {
                  vendorId: "asc",
                },
              ],

              select: {
                id: true,
                priority: true,
                isActive: true,

                vendor: {
                  select: {
                    id: true,
                    vendorCode: true,
                    businessName: true,
                    contactName: true,
                    status: true,
                  },
                },
              },
            },
          },
        });

    if (!area) {
      throw new NotFoundException(
        "Service area not found.",
      );
    }

    return area;
  }

  async listEligibleVendors(
    pincodeIdInput: unknown,
    searchInput?: unknown,
  ) {
    const pincodeId =
      this.parsePositiveInt(
        pincodeIdInput,
        "pincode id",
      );

    const search =
      this.normalizeSearch(
        searchInput,
      );

    const area =
      await this.prisma
        .serviceablePincode
        .findUnique({
          where: {
            id: pincodeId,
          },

          select: {
            id: true,
            isActive: true,
          },
        });

    if (!area) {
      throw new NotFoundException(
        "Service area not found.",
      );
    }

    if (!area.isActive) {
      return [];
    }

    return this.prisma
      .vendorServiceArea
      .findMany({
        where: {
          serviceablePincodeId:
            pincodeId,

          isActive: true,

          vendor: {
            status:
              VendorStatus.ACTIVE,

            ...(search
              ? {
                  OR: [
                    {
                      vendorCode: {
                        contains:
                          search,

                        mode:
                          "insensitive",
                      },
                    },
                    {
                      businessName: {
                        contains:
                          search,

                        mode:
                          "insensitive",
                      },
                    },
                  ],
                }
              : {}),
          },
        },

        take: 50,

        orderBy: [
          {
            priority: "asc",
          },
          {
            vendorId: "asc",
          },
        ],

        select: {
          priority: true,

          vendor: {
            select: {
              id: true,
              vendorCode: true,
              businessName: true,
              status: true,
            },
          },
        },
      })
      .then((rows) =>
        rows.map((row) => ({
          ...row.vendor,
          priority:
            row.priority,
        })),
      );
  }

  async listOrders(
    query: {
      search?: unknown;
      assignment?: unknown;
      page?: unknown;
      limit?: unknown;
    },
  ) {
    const {
      page,
      limit,
      skip,
    } = this.parsePagination(
      query.page,
      query.limit,
    );

    const search =
      this.normalizeSearch(
        query.search,
      );

    const assignment =
      this.parseAssignmentFilter(
        query.assignment,
      );

    const where = {
      ...(assignment === "ASSIGNED"
        ? {
            currentVendorId: {
              not: null,
            },
          }
        : {}),

      ...(assignment === "UNASSIGNED"
        ? {
            currentVendorId: null,
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
                addressSnapshot: {
                  is: {
                    pincode: {
                      contains: search,
                    },
                  },
                },
              },
              {
                currentVendor: {
                  is: {
                    OR: [
                      {
                        vendorCode: {
                          contains:
                            search,

                          mode:
                            "insensitive" as const,
                        },
                      },
                      {
                        businessName: {
                          contains:
                            search,

                          mode:
                            "insensitive" as const,
                        },
                      },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [
      rows,
      total,
    ] = await this.prisma.$transaction([
      this.prisma.sellOrder.findMany({
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
              pincode: true,
              city: true,
              state: true,
            },
          },

          currentVendor: {
            select: {
              id: true,
              vendorCode: true,
              businessName: true,
              status: true,
            },
          },

          vendorAssignments: {
            where: {
              unassignedAt: null,
            },

            take: 1,

            orderBy: {
              assignedAt: "desc",
            },

            select: {
              source: true,
              reason: true,
              assignedAt: true,
              prioritySnapshot: true,
            },
          },
        },
      }),

      this.prisma.sellOrder.count({
        where,
      }),
    ]);

    return {
      data:
        rows.map((row) => ({
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
          createdAt:
            row.createdAt,

          address:
            row.addressSnapshot,

          vendor:
            row.currentVendor,

          routing:
            row.vendorAssignments[0] ??
            null,
        })),

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(total / limit),
      },
    };
  }

  async getOrder(
    orderNumberInput: unknown,
  ) {
    const orderNumber =
      String(orderNumberInput ?? "")
        .trim()
        .slice(0, 100);

    if (!orderNumber) {
      throw new BadRequestException(
        "Order number is required.",
      );
    }

    const order =
      await this.prisma.sellOrder.findUnique({
        where: {
          orderNumber,
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
          status: true,
          pickupDate: true,
          payoutMethod: true,
          createdAt: true,
          updatedAt: true,

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

          currentVendor: {
            select: {
              id: true,
              vendorCode: true,
              businessName: true,
              contactName: true,
              phone: true,
              email: true,
              status: true,
            },
          },

          pickupSlot: {
            select: {
              code: true,
              label: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      });

    if (!order) {
      throw new NotFoundException(
        "Order not found.",
      );
    }

    return order;
  }

  async getOrderHistory(
    orderNumberInput: unknown,
  ) {
    const orderNumber =
      String(orderNumberInput ?? "")
        .trim()
        .slice(0, 100);

    const order =
      await this.prisma.sellOrder.findUnique({
        where: {
          orderNumber,
        },

        select: {
          id: true,
          orderNumber: true,

          vendorAssignments: {
            orderBy: [
              {
                assignedAt: "desc",
              },
              {
                id: "desc",
              },
            ],

            select: {
              id: true,
              source: true,
              reason: true,
              prioritySnapshot: true,
              assignedAt: true,
              unassignedAt: true,
              unassignmentReason: true,

              vendor: {
                select: {
                  id: true,
                  vendorCode: true,
                  businessName: true,
                },
              },
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
      orderNumber:
        order.orderNumber,

      history:
        order.vendorAssignments,
    };
  }

  private async assignInsideTransaction(
    tx: Prisma.TransactionClient,
    orderId: string,
    vendorId: number,
    // source: OrderVendorAssignmentSource.MANUAL
    //   | OrderVendorAssignmentSource.REROUTE,
    // reason:
    //   | OrderVendorAssignmentReason.MANUAL_ADMIN
    //   | OrderVendorAssignmentReason.REROUTE,
    source: OrderVendorAssignmentSource,
    reason: OrderVendorAssignmentReason,
  ) {
    await this.lockOrder(
      tx,
      orderId,
    );

    const order =
      await tx.sellOrder.findUnique({
        where: {
          id: orderId,
        },

        select: {
          id: true,
          orderNumber: true,
          status: true,
          currentVendorId: true,

          addressSnapshot: {
            select: {
              pincode: true,
            },
          },
        },
      });

    if (!order) {
      throw new NotFoundException(
        "Order not found.",
      );
    }

    if (
      !REROUTABLE_STATUSES.has(
        order.status,
      )
    ) {
      throw new ConflictException(
        `Order cannot be routed while status is ${order.status}.`,
      );
    }

    if (!order.addressSnapshot) {
      throw new ConflictException(
        "Order address snapshot is missing.",
      );
    }

    if (
      order.currentVendorId === vendorId
    ) {
      throw new ConflictException(
        "Order is already assigned to this vendor.",
      );
    }

    const mapping =
      await tx.vendorServiceArea
        .findFirst({
          where: {
            vendorId,

            isActive: true,

            vendor: {
              status:
                VendorStatus.ACTIVE,
            },

            serviceablePincode: {
              isActive: true,

              pincode:
                order.addressSnapshot
                  .pincode,
            },
          },

          select: {
            vendorId: true,
            priority: true,
          },
        });

    if (!mapping) {
      throw new BadRequestException(
        "Selected vendor is not eligible for this order pincode.",
      );
    }

    if (
      order.currentVendorId !== null
    ) {
      const closed =
        await tx
          .orderVendorAssignment
          .updateMany({
            where: {
              orderId:
                order.id,

              unassignedAt:
                null,
            },

            data: {
              unassignedAt:
                new Date(),

              unassignmentReason:
                OrderVendorUnassignmentReason
                  .REROUTED,
            },
          });

      if (closed.count !== 1) {
        throw new ConflictException(
          "Order routing state is inconsistent.",
        );
      }
    } else {
      const activeHistoryCount =
        await tx
          .orderVendorAssignment
          .count({
            where: {
              orderId:
                order.id,

              unassignedAt:
                null,
            },
          });

      if (
        activeHistoryCount !== 0
      ) {
        throw new ConflictException(
          "Order routing state is inconsistent.",
        );
      }
    }

    await tx.sellOrder.update({
      where: {
        id: order.id,
      },

      data: {
        currentVendorId:
          vendorId,
      },

      select: {
        id: true,
      },
    });

    const assignment =
      await tx
        .orderVendorAssignment
        .create({
          data: {
            orderId:
              order.id,

            vendorId,

            source,
            reason,

            prioritySnapshot:
              mapping.priority,
          },

          select: {
            id: true,
            assignedAt: true,

            vendor: {
              select: {
                id: true,
                vendorCode: true,
                businessName: true,
              },
            },
          },
        });

    return {
      orderNumber:
        order.orderNumber,

      assignment,
    };
  }

  async assignOrder(
    orderNumberInput: unknown,
    input: OrderRoutingActionInput,
  ) {
    const orderNumber =
      String(orderNumberInput ?? "")
        .trim()
        .slice(0, 100);

    if (!orderNumber) {
      throw new BadRequestException(
        "Order number is required.",
      );
    }

    const vendorId =
      this.parsePositiveInt(
        input.vendorId,
        "vendor id",
      );

    const order =
      await this.prisma.sellOrder.findUnique({
        where: {
          orderNumber,
        },

        select: {
          id: true,
          currentVendorId: true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        "Order not found.",
      );
    }

    if (
      order.currentVendorId !== null
    ) {
      throw new ConflictException(
        "Order is already assigned. Use reroute instead.",
      );
    }

    return this.prisma.$transaction(
      (tx) =>
        this.assignInsideTransaction(
          tx,
          order.id,
          vendorId,
          OrderVendorAssignmentSource.MANUAL,
          OrderVendorAssignmentReason.MANUAL_ADMIN,
        ),
    );
  }

  async rerouteOrder(
    orderNumberInput: unknown,
    input: OrderRoutingActionInput,
  ) {
    const orderNumber =
      String(orderNumberInput ?? "")
        .trim()
        .slice(0, 100);

    if (!orderNumber) {
      throw new BadRequestException(
        "Order number is required.",
      );
    }

    const vendorId =
      this.parsePositiveInt(
        input.vendorId,
        "vendor id",
      );

    const order =
      await this.prisma.sellOrder.findUnique({
        where: {
          orderNumber,
        },

        select: {
          id: true,
          currentVendorId: true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        "Order not found.",
      );
    }

    if (
      order.currentVendorId === null
    ) {
      throw new ConflictException(
        "Order is unassigned. Use assign instead.",
      );
    }

    return this.prisma.$transaction(
      (tx) =>
        this.assignInsideTransaction(
          tx,
          order.id,
          vendorId,
          OrderVendorAssignmentSource.REROUTE,
          OrderVendorAssignmentReason.REROUTE,
        ),
    );
  }
}