import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma, SellOrderStatus } from '../generated/prisma/client.js';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

type AgentOrderDateFilter =
  'ALL' | 'TODAY' | 'TOMORROW' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS';

type AgentOrderStatusGroup =
  'ALL' | 'PENDING' | 'IN_PROCESS' | 'COMPLETED' | 'CANCELLED';

const STATUS_GROUPS: Record<
  Exclude<AgentOrderStatusGroup, 'ALL'>,
  SellOrderStatus[]
> = {
  PENDING: [SellOrderStatus.PICKUP_REQUESTED, SellOrderStatus.PICKUP_CONFIRMED],

  IN_PROCESS: [
    SellOrderStatus.PICKUP_STARTED,
    SellOrderStatus.INSPECTION_COMPLETED,
    SellOrderStatus.PAYMENT_COMPLETED,
  ],

  COMPLETED: [SellOrderStatus.COMPLETED],

  CANCELLED: [SellOrderStatus.CANCELLED],
};

@Injectable()
export class AgentOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrders(
    agentId: number,
    vendorId: number,
    query: {
      search?: unknown;
      statusGroup?: unknown;
      dateFilter?: unknown;
      page?: unknown;
      limit?: unknown;
    },
  ) {
    const page = this.parsePositiveInt(query.page, 1, 1_000_000);

    const limit = this.parsePositiveInt(query.limit, 20, 50);

    const search = this.normalizeSearch(query.search);

    const statusGroup = this.parseStatusGroup(query.statusGroup);

    const dateFilter = this.parseDateFilter(query.dateFilter);

    const pickupRange = this.getPickupDateRange(dateFilter);

    const where: Prisma.SellOrderWhereInput = {
      /*
       * Vendor isolation + current Agent
       * assignment are BOTH mandatory.
       */
      currentVendorId: vendorId,

      agentAssignments: {
        some: {
          agentId,
          vendorId,
          unassignedAt: null,
        },
      },

      ...(pickupRange
        ? {
            pickupDate: pickupRange,
          }
        : {}),

      ...(statusGroup !== 'ALL'
        ? {
            status: {
              in: STATUS_GROUPS[statusGroup],
            },
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                orderNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },

              {
                productName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },

              {
                variantLabel: {
                  contains: search,
                  mode: 'insensitive',
                },
              },

              {
                addressSnapshot: {
                  is: {
                    fullName: {
                      contains: search,
                      mode: 'insensitive',
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
                    locality: {
                      contains: search,
                      mode: 'insensitive',
                    },
                  },
                },
              },

              {
                addressSnapshot: {
                  is: {
                    city: {
                      contains: search,
                      mode: 'insensitive',
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
            ],
          }
        : {}),
    };

    const skip = (page - 1) * limit;

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.sellOrder.findMany({
        where,

        skip,
        take: limit,

        /*
         * Field Agent ko nearest
         * pickups first dikhne chahiye.
         */
        orderBy: [
          {
            pickupDate: 'asc',
          },
          {
            pickupSlot: {
              displayOrder: 'asc',
            },
          },
          {
            createdAt: 'desc',
          },
        ],

        select: {
          id: true,
          orderNumber: true,

          productName: true,
          productImage: true,
          variantLabel: true,

          /*
           * Display only.
           * Agent is NOT calculating this.
           */
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
              email: true,

              house: true,
              street: true,
              locality: true,
              landmark: true,

              pincode: true,
              city: true,
              state: true,
            },
          },

          agentAssignments: {
            where: {
              agentId,
              vendorId,
              unassignedAt: null,
            },

            take: 1,

            orderBy: [
              {
                assignedAt: 'desc',
              },
              {
                id: 'desc',
              },
            ],

            select: {
              id: true,
              source: true,
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
      data: orders.map((order) => ({
        id: order.id,

        orderNumber: order.orderNumber,

        product: {
          name: order.productName,

          variant: order.variantLabel,

          image: order.productImage,
        },

        customer: order.addressSnapshot
          ? {
              name: order.addressSnapshot.fullName,

              phone: order.addressSnapshot.phone,
              email: order.addressSnapshot.email,
            }
          : null,

        address: order.addressSnapshot
          ? {
              house: order.addressSnapshot.house,

              street: order.addressSnapshot.street,

              locality: order.addressSnapshot.locality,

              landmark: order.addressSnapshot.landmark,

              pincode: order.addressSnapshot.pincode,

              city: order.addressSnapshot.city,

              state: order.addressSnapshot.state,
            }
          : null,

        pickup: {
          date: order.pickupDate,

          slot: order.pickupSlot,
        },

        status: order.status,

        dealValue: Number(order.finalPrice),

        assignment: order.agentAssignments[0] ?? null,

        createdAt: order.createdAt,

        updatedAt: order.updatedAt,
      })),

      pagination: {
        page,
        limit,
        total,

        totalPages: Math.ceil(total / limit),
      },

      filters: {
        search,
        statusGroup,
        dateFilter,
      },
    };
  }

  async getOrder(agentId: number, vendorId: number, orderNumberInput: unknown) {
    const orderNumber = String(orderNumberInput ?? '')
      .trim()
      .slice(0, 100);

    if (!orderNumber) {
      throw new BadRequestException('Order number is required.');
    }

    /*
     * Security is intentionally inside
     * the DB query.
     *
     * Other Agent / Vendor order will
     * return 404 instead of leaking
     * whether it exists.
     */
    const order = await this.prisma.sellOrder.findFirst({
      where: {
        orderNumber,

        currentVendorId: vendorId,

        agentAssignments: {
          some: {
            agentId,
            vendorId,
            unassignedAt: null,
          },
        },
      },

      select: {
        id: true,
        orderNumber: true,

        productId: true,
        variantId: true,

        productName: true,
        productImage: true,
        variantLabel: true,

        status: true,

        pickupDate: true,

        /*
         * Read-only pricing snapshot.
         */
        basePrice: true,
        totalDeduction: true,
        finalPrice: true,

        payoutMethod: true,

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
            email: true,

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

        agentAssignments: {
          where: {
            agentId,
            vendorId,
            unassignedAt: null,
          },

          take: 1,

          orderBy: {
            assignedAt: 'desc',
          },

          select: {
            id: true,
            source: true,
            assignedAt: true,
          },
        },

        statusHistory: {
          orderBy: {
            createdAt: 'asc',
          },

          select: {
            id: true,
            status: true,
            note: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return {
      id: order.id,

      orderNumber: order.orderNumber,

      product: {
        id: order.productId,

        variantId: order.variantId,

        name: order.productName,

        variant: order.variantLabel,

        image: order.productImage,
      },

      customer: order.addressSnapshot
        ? {
            name: order.addressSnapshot.fullName,

            phone: order.addressSnapshot.phone,

            email: order.addressSnapshot.email,
          }
        : null,

      address: order.addressSnapshot,

      pickup: {
        date: order.pickupDate,

        slot: order.pickupSlot,
      },

      /*
       * Still read-only.
       * Inspection/requote API will be
       * separate later.
       */
      pricing: {
        basePrice: Number(order.basePrice),

        totalDeduction: Number(order.totalDeduction),

        finalPrice: Number(order.finalPrice),
      },

      payoutMethod: order.payoutMethod,

      status: order.status,

      assignment: order.agentAssignments[0] ?? null,

      statusHistory: order.statusHistory,

      createdAt: order.createdAt,

      updatedAt: order.updatedAt,
    };
  }

  private parsePositiveInt(value: unknown, fallback: number, max: number) {
    const parsed = Number.parseInt(String(value ?? ''), 10);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }

    return Math.min(parsed, max);
  }

  private normalizeSearch(value: unknown) {
    return String(value ?? '')
      .trim()
      .slice(0, 100);
  }

  private parseStatusGroup(value: unknown): AgentOrderStatusGroup {
    const raw = String(value ?? 'ALL')
      .trim()
      .toUpperCase();

    const allowed: AgentOrderStatusGroup[] = [
      'ALL',
      'PENDING',
      'IN_PROCESS',
      'COMPLETED',
      'CANCELLED',
    ];

    if (!allowed.includes(raw as AgentOrderStatusGroup)) {
      throw new BadRequestException('Invalid order status group.');
    }

    return raw as AgentOrderStatusGroup;
  }

  private parseDateFilter(value: unknown): AgentOrderDateFilter {
    const raw = String(value ?? 'ALL')
      .trim()
      .toUpperCase();

    const allowed: AgentOrderDateFilter[] = [
      'ALL',
      'TODAY',
      'TOMORROW',
      'YESTERDAY',
      'LAST_7_DAYS',
      'LAST_30_DAYS',
    ];

    if (!allowed.includes(raw as AgentOrderDateFilter)) {
      throw new BadRequestException('Invalid date filter.');
    }

    return raw as AgentOrderDateFilter;
  }

  /*
   * IMPORTANT:
   * Explicit Asia/Kolkata date
   * boundaries.
   *
   * Server can later run in UTC and
   * Agent's Today/Tomorrow will still
   * remain India dates.
   */
  private getPickupDateRange(
    filter: AgentOrderDateFilter,
  ): Prisma.DateTimeFilter | null {
    if (filter === 'ALL') {
      return null;
    }

    /*
     * pickupDate is PostgreSQL DATE
     * (@db.Date), not an instant.
     *
     * First determine the current
     * calendar date in Asia/Kolkata,
     * then represent that DATE at
     * UTC midnight for Prisma.
     */
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',

      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const year = Number(parts.find((part) => part.type === 'year')?.value);

    const month = Number(parts.find((part) => part.type === 'month')?.value);

    const day = Number(parts.find((part) => part.type === 'day')?.value);

    const makeDate = (dayOffset: number) =>
      new Date(Date.UTC(year, month - 1, day + dayOffset));

    const today = makeDate(0);

    const tomorrow = makeDate(1);

    if (filter === 'TODAY') {
      return {
        gte: today,
        lt: tomorrow,
      };
    }

    if (filter === 'TOMORROW') {
      return {
        gte: tomorrow,
        lt: makeDate(2),
      };
    }

    if (filter === 'YESTERDAY') {
      return {
        gte: makeDate(-1),
        lt: today,
      };
    }

    if (filter === 'LAST_7_DAYS') {
      return {
        gte: makeDate(-6),
        lt: tomorrow,
      };
    }

    return {
      gte: makeDate(-29),
      lt: tomorrow,
    };
  }
}
