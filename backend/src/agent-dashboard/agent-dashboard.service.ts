import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import {
  Prisma,
  SellOrderStatus,
} from '../generated/prisma/client.js';

import {
  PrismaService,
} from '../prisma/prisma/prisma.service.js';

export type AgentDashboardRange =
  | 'ALL'
  | 'TODAY'
  | 'TOMORROW'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS';

type DashboardFilter = {
  range?: unknown;
};

const PENDING_STATUSES: SellOrderStatus[] = [
  SellOrderStatus.PICKUP_REQUESTED,
  SellOrderStatus.PICKUP_CONFIRMED,
  SellOrderStatus.PICKUP_STARTED,
  SellOrderStatus.INSPECTION_COMPLETED,
  SellOrderStatus.PAYMENT_COMPLETED,
];

@Injectable()
export class AgentDashboardService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getDashboard(
    agentId: number,
    vendorId: number,
    filter: DashboardFilter = {},
  ) {
    const range =
      this.parseRange(
        filter.range,
      );

    const pickupRange =
      this.getPickupDateRange(
        range,
      );

    const activeAssignmentWhere:
      Prisma.OrderAgentAssignmentWhereInput =
      {
        agentId,
        vendorId,
        unassignedAt: null,
      };

    const filteredOrderWhere:
      Prisma.SellOrderWhereInput =
      {
        currentVendorId:
          vendorId,

        agentAssignments: {
          some:
            activeAssignmentWhere,
        },

        ...(pickupRange
          ? {
              pickupDate:
                pickupRange,
            }
          : {}),
      };

    const [
      activeAssigned,
      pickups,
      pending,
      completed,
      dealValue,
      orders,
    ] =
      await this.prisma.$transaction([
        /*
         * All open active assignments.
         * This KPI intentionally does not
         * change with date filter.
         */
        this.prisma.sellOrder.count({
          where: {
            currentVendorId:
              vendorId,

            status: {
              notIn: [
                SellOrderStatus.COMPLETED,
                SellOrderStatus.CANCELLED,
              ],
            },

            agentAssignments: {
              some:
                activeAssignmentWhere,
            },
          },
        }),

        /*
         * Orders in selected pickup range.
         */
        this.prisma.sellOrder.count({
          where: {
            ...filteredOrderWhere,

            status: {
              not:
                SellOrderStatus.CANCELLED,
            },
          },
        }),

        this.prisma.sellOrder.count({
          where: {
            ...filteredOrderWhere,

            status: {
              in:
                PENDING_STATUSES,
            },
          },
        }),

        this.prisma.sellOrder.count({
          where: {
            ...filteredOrderWhere,

            status:
              SellOrderStatus.COMPLETED,
          },
        }),

        /*
         * Deal value != Agent earnings.
         * This is completed order value only.
         */
        this.prisma.sellOrder.aggregate({
          where: {
            ...filteredOrderWhere,

            status:
              SellOrderStatus.COMPLETED,
          },

          _sum: {
            finalPrice: true,
          },
        }),

        this.prisma.sellOrder.findMany({
          where: {
            ...filteredOrderWhere,

            status: {
              not:
                SellOrderStatus.CANCELLED,
            },
          },

          take: 50,

          orderBy: [
            {
              pickupDate:
                'asc',
            },

            {
              pickupSlot: {
                displayOrder:
                  'asc',
              },
            },

            {
              updatedAt:
                'desc',
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
              },
            },

            agentAssignments: {
              where: {
                agentId,
                vendorId,
                unassignedAt:
                  null,
              },

              take: 1,

              orderBy: {
                assignedAt:
                  'desc',
              },

              select: {
                id: true,
                assignedAt: true,
              },
            },
          },
        }),
      ]);

    return {
      filter: {
        range,
        label:
          this.getRangeLabel(
            range,
          ),
      },

      summary: {
        assigned:
          activeAssigned,

        pickups,

        pending,

        completed,

        dealValue:
          Number(
            dealValue._sum
              .finalPrice ?? 0,
          ),
      },

      pickups:
        orders.map(
          (order) => ({
            assignmentId:
              order
                .agentAssignments[0]
                ?.id ?? null,

            assignedAt:
              order
                .agentAssignments[0]
                ?.assignedAt ??
              null,

            orderId:
              order.id,

            orderNumber:
              order.orderNumber,

            product: {
              name:
                order.productName,

              variant:
                order.variantLabel,

              image:
                order.productImage,
            },

            customer:
              order.addressSnapshot
                ? {
                    name:
                      order
                        .addressSnapshot
                        .fullName,

                    phone:
                      order
                        .addressSnapshot
                        .phone,
                  }
                : null,

            pickup: {
              date:
                order.pickupDate,

              slot:
                order.pickupSlot,
            },

            address:
              order.addressSnapshot
                ? {
                    house:
                      order
                        .addressSnapshot
                        .house,

                    street:
                      order
                        .addressSnapshot
                        .street,

                    locality:
                      order
                        .addressSnapshot
                        .locality,

                    landmark:
                      order
                        .addressSnapshot
                        .landmark,

                    pincode:
                      order
                        .addressSnapshot
                        .pincode,

                    city:
                      order
                        .addressSnapshot
                        .city,

                    state:
                      order
                        .addressSnapshot
                        .state,
                  }
                : null,

            dealValue:
              Number(
                order.finalPrice,
              ),

            status:
              order.status,
          }),
        ),
    };
  }

  private parseRange(
    value: unknown,
  ): AgentDashboardRange {
    const range =
      String(
        value ?? 'TODAY',
      )
        .trim()
        .toUpperCase();

    const allowed:
      AgentDashboardRange[] =
      [
        'ALL',
        'TODAY',
        'TOMORROW',
        'YESTERDAY',
        'LAST_7_DAYS',
        'LAST_30_DAYS',
      ];

    if (
      !allowed.includes(
        range as AgentDashboardRange,
      )
    ) {
      throw new BadRequestException(
        'Invalid dashboard date range.',
      );
    }

    return range as AgentDashboardRange;
  }

  private getRangeLabel(
    range: AgentDashboardRange,
  ) {
    switch (range) {
      case 'ALL':
        return 'All Days';

      case 'TODAY':
        return 'Today';

      case 'TOMORROW':
        return 'Tomorrow';

      case 'YESTERDAY':
        return 'Yesterday';

      case 'LAST_7_DAYS':
        return 'Last 7 Days';

      case 'LAST_30_DAYS':
        return 'Last 30 Days';
    }
  }

  private getPickupDateRange(
    range: AgentDashboardRange,
  ): Prisma.DateTimeFilter | null {
    if (range === 'ALL') {
      return null;
    }

    const now =
      new Date();

    const parts =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'Asia/Kolkata',

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit',
        },
      ).formatToParts(
        now,
      );

    const year =
      Number(
        parts.find(
          (part) =>
            part.type ===
            'year',
        )?.value,
      );

    const month =
      Number(
        parts.find(
          (part) =>
            part.type ===
            'month',
        )?.value,
      );

    const day =
      Number(
        parts.find(
          (part) =>
            part.type ===
            'day',
        )?.value,
      );

    const istOffsetMs =
      330 *
      60 *
      1000;

    const dayMs =
      24 *
      60 *
      60 *
      1000;

    const todayStart =
      new Date(
        Date.UTC(
          year,
          month - 1,
          day,
          0,
          0,
          0,
          0,
        ) -
          istOffsetMs,
      );

    const tomorrowStart =
      new Date(
        todayStart.getTime() +
          dayMs,
      );

    switch (range) {
  case 'TODAY':
    return {
      gte: todayStart,
      lt: tomorrowStart,
    };

  case 'TOMORROW':
    return {
      gte: tomorrowStart,

      lt: new Date(
        tomorrowStart.getTime() +
          dayMs,
      ),
    };

  case 'YESTERDAY':
    return {
      gte: new Date(
        todayStart.getTime() -
          dayMs,
      ),

      lt: todayStart,
    };

  case 'LAST_7_DAYS':
    return {
      gte: new Date(
        todayStart.getTime() -
          6 * dayMs,
      ),

      lt: tomorrowStart,
    };

  case 'LAST_30_DAYS':
    return {
      gte: new Date(
        todayStart.getTime() -
          29 * dayMs,
      ),

      lt: tomorrowStart,
    };
}
  }
}