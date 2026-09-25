import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  AgentStatus,
  OrderAgentAssignmentSource,
  OrderAgentUnassignmentReason,
  Prisma,
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

type StatusGroup =
  | "ALL"
  | "PENDING"
  | "IN_PROCESS"
  | "COMPLETED"
  | "CANCELLED";

type QuestionnaireSelection = {
  itemId: number;
  optionId: number | null;
  optionIds: number[];
  childOptionIds: number[];
};

const STATUS_GROUPS: Record<
  Exclude<StatusGroup, "ALL">,
  SellOrderStatus[]
> = {
  PENDING: [
    SellOrderStatus.PICKUP_REQUESTED,
    SellOrderStatus.PICKUP_CONFIRMED,
  ],

  IN_PROCESS: [
    SellOrderStatus.PICKUP_STARTED,
    SellOrderStatus.INSPECTION_COMPLETED,
    SellOrderStatus.PAYMENT_COMPLETED,
  ],

  COMPLETED: [
    SellOrderStatus.COMPLETED,
  ],

  CANCELLED: [
    SellOrderStatus.CANCELLED,
  ],
};

const AGENT_SUMMARY_SELECT = {
  id: true,
  agentCode: true,
  fullName: true,
  mobile: true,
  email: true,
} satisfies Prisma.AgentSelect;

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

  private normalizeSearch(
    value: unknown,
  ) {
    return String(value ?? "")
      .trim()
      .slice(0, 100);
  }

  private normalizeOrderNumber(
    value: unknown,
  ) {
    const orderNumber =
      String(value ?? "")
        .trim()
        .slice(0, 100);

    if (!orderNumber) {
      throw new BadRequestException(
        "Order number is required.",
      );
    }

    return orderNumber;
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

  private parseStatusGroup(
    value: unknown,
  ): StatusGroup {
    const raw = String(value ?? "ALL")
      .trim()
      .toUpperCase();

    const allowed: StatusGroup[] = [
      "ALL",
      "PENDING",
      "IN_PROCESS",
      "COMPLETED",
      "CANCELLED",
    ];

    if (
      !allowed.includes(
        raw as StatusGroup,
      )
    ) {
      throw new BadRequestException(
        "Invalid order status group.",
      );
    }

    return raw as StatusGroup;
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

  private getAssignmentDateRange(
    filter: DateFilter,
  ) {
    if (filter === "ALL") {
      return null;
    }

    const now = new Date();

    const parts =
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
      parts.find(
        (part) => part.type === "year",
      )?.value,
    );

    const month = Number(
      parts.find(
        (part) => part.type === "month",
      )?.value,
    );

    const day = Number(
      parts.find(
        (part) => part.type === "day",
      )?.value,
    );

    const istOffsetMs =
      330 * 60 * 1000;

    const todayStart = new Date(
      Date.UTC(
        year,
        month - 1,
        day,
        0,
        0,
        0,
        0,
      ) - istOffsetMs,
    );

    const dayMs =
      24 * 60 * 60 * 1000;

    const tomorrowStart =
      new Date(
        todayStart.getTime() +
          dayMs,
      );

    if (filter === "TODAY") {
      return {
        gte: todayStart,
        lt: tomorrowStart,
      };
    }

    if (
      filter === "YESTERDAY"
    ) {
      return {
        gte: new Date(
          todayStart.getTime() -
            dayMs,
        ),
        lt: todayStart,
      };
    }

    if (
      filter === "LAST_7_DAYS"
    ) {
      return {
        gte: new Date(
          todayStart.getTime() -
            6 * dayMs,
        ),
        lt: tomorrowStart,
      };
    }

    return {
      gte: new Date(
        todayStart.getTime() -
          29 * dayMs,
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

  private getStatusWhere(
    status:
      | SellOrderStatus
      | undefined,
    statusGroup: StatusGroup,
  ) {
    if (status) {
      return {
        status,
      };
    }

    if (
      statusGroup === "ALL"
    ) {
      return {};
    }

    return {
      status: {
        in:
          STATUS_GROUPS[
            statusGroup
          ],
      },
    };
  }

  private normalizeQuestionnaireSnapshot(
    value: unknown,
  ): QuestionnaireSelection[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap(
      (entry) => {
        if (
          !entry ||
          typeof entry !==
            "object"
        ) {
          return [];
        }

        const raw =
          entry as Record<
            string,
            unknown
          >;

        const itemId =
          Number(raw.itemId);

        if (
          !Number.isInteger(
            itemId,
          )
        ) {
          return [];
        }

        const optionIdRaw =
          raw.optionId;

        const optionId =
          optionIdRaw === null ||
          optionIdRaw ===
            undefined
            ? null
            : Number(
                optionIdRaw,
              );

        const optionIds =
          this.toIntegerArray(
            raw.optionIds,
          );

        const childOptionIds =
          this.toIntegerArray(
            raw.childOptionIds,
          );

        return [
          {
            itemId,

            optionId:
              optionId !== null &&
              Number.isInteger(
                optionId,
              )
                ? optionId
                : null,

            optionIds,
            childOptionIds,
          },
        ];
      },
    );
  }

  private toIntegerArray(
    value: unknown,
  ): number[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(
      new Set(
        value
          .map(Number)
          .filter(
            Number.isInteger,
          ),
      ),
    );
  }

  private mapAgent(
    agent:
      | {
          id: number;
          agentCode: string;
          fullName: string;
          mobile: string;
          email: string;
        }
      | null
      | undefined,
  ) {
    if (!agent) {
      return null;
    }

    return {
      id: agent.id,
      agentCode:
        agent.agentCode,
      name:
        agent.fullName,
      fullName:
        agent.fullName,
      mobile:
        agent.mobile,
      email:
        agent.email,
    };
  }

  private async buildDeviceReport(
    questionnaireSnapshot: unknown,
  ) {
    const selections =
      this.normalizeQuestionnaireSnapshot(
        questionnaireSnapshot,
      );

    if (
      selections.length === 0
    ) {
      return {
        available: false,
        historicalLabelsResolved:
          false,
        perAnswerDeductionAvailable:
          false,
        sections: [],
      };
    }

    const itemIds =
      Array.from(
        new Set(
          selections.map(
            (selection) =>
              selection.itemId,
          ),
        ),
      );

    const items =
      await this.prisma.questionnaireItem.findMany({
        where: {
          id: {
            in: itemIds,
          },
        },

        select: {
          id: true,
          name: true,
          questionText: true,
          answerType: true,
          displayOrder: true,

          section: {
            select: {
              id: true,
              name: true,
              displayOrder: true,
            },
          },

          options: {
            select: {
              id: true,
              label: true,
              value: true,
              issueCode: true,
              severity: true,
              parentOptionId: true,
              displayOrder: true,

              issueGroup: {
                select: {
                  id: true,
                  name: true,
                  displayOrder: true,
                },
              },
            },

            orderBy: [
              {
                displayOrder:
                  "asc",
              },
              {
                id: "asc",
              },
            ],
          },
        },
      });

    const itemMap =
      new Map(
        items.map(
          (item) => [
            item.id,
            item,
          ],
        ),
      );

    const sectionMap =
      new Map<
        number,
        {
          id: number;
          name: string;
          displayOrder: number;
          checks: Array<{
            itemId: number;
            name: string;
            question: string;
            answerType: string;
            selectedAnswers: Array<{
              id: number;
              label: string;
              value: string;
              issueCode:
                | string
                | null;
              severity: string;
              parentOptionId:
                | number
                | null;
              issueGroup: {
                id: number;
                name: string;
              } | null;
              selectionType:
                | "PRIMARY"
                | "OPTION"
                | "CHILD";
            }>;
          }>;
        }
      >();

    for (
      const selection of
      selections
    ) {
      const item =
        itemMap.get(
          selection.itemId,
        );

      if (!item) {
        continue;
      }

      const selectedIds =
        new Map<
          number,
          | "PRIMARY"
          | "OPTION"
          | "CHILD"
        >();

      if (
        selection.optionId !==
        null
      ) {
        selectedIds.set(
          selection.optionId,
          "PRIMARY",
        );
      }

      for (
        const id of
        selection.optionIds
      ) {
        if (
          !selectedIds.has(id)
        ) {
          selectedIds.set(
            id,
            "OPTION",
          );
        }
      }

      for (
        const id of
        selection.childOptionIds
      ) {
        selectedIds.set(
          id,
          "CHILD",
        );
      }

      const optionMap =
        new Map(
          item.options.map(
            (option) => [
              option.id,
              option,
            ],
          ),
        );

      const selectedAnswers =
        Array.from(
          selectedIds.entries(),
        )
          .map(
            ([
              optionId,
              selectionType,
            ]) => {
              const option =
                optionMap.get(
                  optionId,
                );

              if (!option) {
                return null;
              }

              return {
                id:
                  option.id,

                label:
                  option.label,

                value:
                  option.value,

                issueCode:
                  option.issueCode,

                severity:
                  String(
                    option.severity,
                  ),

                parentOptionId:
                  option.parentOptionId,

                issueGroup:
                  option.issueGroup
                    ? {
                        id:
                          option
                            .issueGroup
                            .id,

                        name:
                          option
                            .issueGroup
                            .name,
                      }
                    : null,

                selectionType,
              };
            },
          )
          .filter(
            (
              answer,
            ): answer is NonNullable<
              typeof answer
            > =>
              Boolean(answer),
          );

      let section =
        sectionMap.get(
          item.section.id,
        );

      if (!section) {
        section = {
          id:
            item.section.id,

          name:
            item.section.name,

          displayOrder:
            item.section
              .displayOrder,

          checks: [],
        };

        sectionMap.set(
          item.section.id,
          section,
        );
      }

      section.checks.push({
        itemId:
          item.id,

        name:
          item.name,

        question:
          item.questionText,

        answerType:
          String(
            item.answerType,
          ),

        selectedAnswers,
      });
    }

    const sections =
      Array.from(
        sectionMap.values(),
      )
        .sort(
          (a, b) =>
            a.displayOrder -
            b.displayOrder,
        )
        .map(
          (section) => ({
            id:
              section.id,

            name:
              section.name,

            checks:
              section.checks.sort(
                (a, b) => {
                  const itemA =
                    itemMap.get(
                      a.itemId,
                    );

                  const itemB =
                    itemMap.get(
                      b.itemId,
                    );

                  return (
                    Number(
                      itemA
                        ?.displayOrder ??
                        0,
                    ) -
                    Number(
                      itemB
                        ?.displayOrder ??
                        0,
                    )
                  );
                },
              ),
          }),
        );

    return {
      available:
        sections.length > 0,

      historicalLabelsResolved:
        true,

      perAnswerDeductionAvailable:
        false,

      sections,
    };
  }

  /*
   * Lightweight endpoint for the order
   * assignment GUI.
   *
   * Only ACTIVE agents belonging to the
   * authenticated vendor are returned.
   */
  async getAssignableAgents(
    vendorId: number,
  ) {
    const agents =
      await this.prisma.agent.findMany({
        where: {
          vendorId,
          status:
            AgentStatus.ACTIVE,
        },

        orderBy: [
          {
            fullName: "asc",
          },
          {
            id: "asc",
          },
        ],

        select: {
          ...AGENT_SUMMARY_SELECT,

          _count: {
            select: {
              orderAssignments: {
                where: {
                  vendorId,
                  unassignedAt:
                    null,
                },
              },
            },
          },
        },
      });

    return {
      data: agents.map(
        (agent) => ({
          ...this.mapAgent(
            agent,
          ),

          activeAssignmentCount:
            agent._count
              .orderAssignments,
        }),
      ),
    };
  }

  /*
   * Assign or reassign an order.
   *
   * Important:
   * - vendorId comes only from authenticated
   *   vendor session.
   * - agent must belong to same vendor.
   * - agent must be ACTIVE.
   * - customer quote/pricing/status/payout
   *   are never modified here.
   * - assigning same agent is idempotent.
   */
  async assignAgent(
    vendorId: number,
    orderNumberInput: unknown,
    agentIdInput: unknown,
  ) {
    const orderNumber =
      this.normalizeOrderNumber(
        orderNumberInput,
      );

    const agentId =
      Number(agentIdInput);

    if (
      !Number.isInteger(
        agentId,
      ) ||
      agentId <= 0
    ) {
      throw new BadRequestException(
        "Valid agentId is required.",
      );
    }

    /*
     * Validate ownership before entering
     * write transaction.
     */
    const [order, agent] =
      await Promise.all([
        this.prisma.sellOrder.findFirst({
          where: {
            orderNumber,
            currentVendorId:
              vendorId,
          },

          select: {
            id: true,
            orderNumber: true,
          },
        }),

        this.prisma.agent.findFirst({
          where: {
            id: agentId,
            vendorId,
            status:
              AgentStatus.ACTIVE,
          },

          select:
            AGENT_SUMMARY_SELECT,
        }),
      ]);

    if (!order) {
      throw new NotFoundException(
        "Order not found.",
      );
    }

    if (!agent) {
      throw new BadRequestException(
        "Agent not found, does not belong to this vendor, or is not active.",
      );
    }

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          /*
           * Re-check order ownership inside
           * transaction. This protects against
           * vendor rerouting between validation
           * and assignment.
           */
          const lockedOrder =
            await tx.sellOrder.findFirst({
              where: {
                id: order.id,
                orderNumber,
                currentVendorId:
                  vendorId,
              },

              select: {
                id: true,
                orderNumber: true,
              },
            });

          if (!lockedOrder) {
            throw new NotFoundException(
              "Order is no longer assigned to this vendor.",
            );
          }

          /*
           * Re-check agent state inside the
           * transaction as well.
           */
          const activeAgent =
            await tx.agent.findFirst({
              where: {
                id: agentId,
                vendorId,
                status:
                  AgentStatus.ACTIVE,
              },

              select:
                AGENT_SUMMARY_SELECT,
            });

          if (!activeAgent) {
            throw new BadRequestException(
              "Agent is no longer active or available for this vendor.",
            );
          }

          const currentAssignments =
            await tx.orderAgentAssignment.findMany({
              where: {
                orderId:
                  lockedOrder.id,

                vendorId,

                unassignedAt:
                  null,
              },

              orderBy: [
                {
                  assignedAt:
                    "desc",
                },
                {
                  id: "desc",
                },
              ],

              select: {
                id: true,
                agentId: true,
                source: true,
                assignedAt: true,

                agent: {
                  select:
                    AGENT_SUMMARY_SELECT,
                },
              },
            });

          const current =
            currentAssignments[0] ??
            null;

          /*
           * Defensive repair:
           * Current schema has indexes but no
           * partial unique constraint for one
           * active assignment.
           *
           * If historical/concurrent bad data
           * already contains >1 active rows,
           * close every extra row.
           */
          if (
            currentAssignments.length >
            1
          ) {
            const duplicateIds =
              currentAssignments
                .slice(1)
                .map(
                  (assignment) =>
                    assignment.id,
                );

            await tx.orderAgentAssignment.updateMany({
              where: {
                id: {
                  in: duplicateIds,
                },

                unassignedAt:
                  null,
              },

              data: {
                unassignedAt:
                  new Date(),

                unassignmentReason:
                  OrderAgentUnassignmentReason.REASSIGNED,
              },
            });
          }

          /*
           * Idempotency:
           * same active agent selected again
           * means no new history row.
           */
          if (
            current &&
            current.agentId ===
              agentId
          ) {
            return {
              changed: false,
              action:
                "UNCHANGED" as const,

              assignment: {
                id:
                  current.id,

                source:
                  current.source,

                assignedAt:
                  current.assignedAt,

                agent:
                  this.mapAgent(
                    current.agent,
                  ),
              },
            };
          }

          const now =
            new Date();

          if (current) {
            /*
             * Guarded updateMany closes every
             * still-active assignment for this
             * vendor/order.
             */
            await tx.orderAgentAssignment.updateMany({
              where: {
                orderId:
                  lockedOrder.id,

                vendorId,

                unassignedAt:
                  null,
              },

              data: {
                unassignedAt:
                  now,

                unassignmentReason:
                  OrderAgentUnassignmentReason.REASSIGNED,
              },
            });
          }

          const created =
            await tx.orderAgentAssignment.create({
              data: {
                orderId:
                  lockedOrder.id,

                vendorId,

                agentId,

                source:
                  current
                    ? OrderAgentAssignmentSource.REASSIGN
                    : OrderAgentAssignmentSource.VENDOR,

                assignedAt:
                  now,
              },

              select: {
                id: true,
                source: true,
                assignedAt: true,

                agent: {
                  select:
                    AGENT_SUMMARY_SELECT,
                },
              },
            });

          return {
            changed: true,

            action:
              current
                ? ("REASSIGNED" as const)
                : ("ASSIGNED" as const),

            assignment: {
              id:
                created.id,

              source:
                created.source,

              assignedAt:
                created.assignedAt,

              agent:
                this.mapAgent(
                  created.agent,
                ),
            },
          };
        },
        {
          isolationLevel:
            Prisma.TransactionIsolationLevel.Serializable,
        },
      );

    return {
      orderNumber,
      ...result,
    };
  }

  async listOrders(
    vendorId: number,
    query: {
      search?: unknown;
      status?: unknown;
      statusGroup?: unknown;
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

    const statusGroup =
      this.parseStatusGroup(
        query.statusGroup,
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

    const statusWhere =
      this.getStatusWhere(
        status,
        statusGroup,
      );

    const where = {
      currentVendorId:
        vendorId,

      ...statusWhere,

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
                  contains:
                    search,
                  mode:
                    "insensitive" as const,
                },
              },

              {
                productName: {
                  contains:
                    search,
                  mode:
                    "insensitive" as const,
                },
              },

              {
                variantLabel: {
                  contains:
                    search,
                  mode:
                    "insensitive" as const,
                },
              },

              {
                addressSnapshot: {
                  is: {
                    fullName: {
                      contains:
                        search,
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
                      contains:
                        search,
                    },
                  },
                },
              },

              {
                addressSnapshot: {
                  is: {
                    pincode: {
                      contains:
                        search,
                    },
                  },
                },
              },

              {
                addressSnapshot: {
                  is: {
                    city: {
                      contains:
                        search,
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

          orderBy: [
            {
              updatedAt:
                "desc",
            },
            {
              id: "desc",
            },
          ],

          select: {
            id: true,
            orderNumber: true,

            productName: true,
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

                house: true,
                street: true,
                locality: true,
                landmark: true,

                pincode: true,
                city: true,
                state: true,
              },
            },

            vendorAssignments: {
              where: {
                vendorId,
                unassignedAt:
                  null,
              },

              orderBy: {
                assignedAt:
                  "desc",
              },

              take: 1,

              select: {
                id: true,
                source: true,
                reason: true,
                assignedAt: true,
              },
            },

            agentAssignments: {
              where: {
                vendorId,
                unassignedAt:
                  null,
              },

              orderBy: [
                {
                  assignedAt:
                    "desc",
                },
                {
                  id: "desc",
                },
              ],

              take: 1,

              select: {
                id: true,
                source: true,
                assignedAt: true,

                agent: {
                  select:
                    AGENT_SUMMARY_SELECT,
                },
              },
            },
          },
        }),

        this.prisma.sellOrder.count({
          where,
        }),
      ]);

    return {
      data: rows.map(
        (row) => {
          const currentAgentAssignment =
            row.agentAssignments[0] ??
            null;

          return {
            id:
              row.id,

            orderNumber:
              row.orderNumber,

            productName:
              row.productName,

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
                      row
                        .addressSnapshot
                        .fullName,

                    phone:
                      row
                        .addressSnapshot
                        .phone,
                  }
                : null,

            address:
              row.addressSnapshot
                ? {
                    house:
                      row
                        .addressSnapshot
                        .house,

                    street:
                      row
                        .addressSnapshot
                        .street,

                    locality:
                      row
                        .addressSnapshot
                        .locality,

                    landmark:
                      row
                        .addressSnapshot
                        .landmark,

                    city:
                      row
                        .addressSnapshot
                        .city,

                    state:
                      row
                        .addressSnapshot
                        .state,

                    pincode:
                      row
                        .addressSnapshot
                        .pincode,
                  }
                : null,

            assignment:
              row.vendorAssignments[0] ??
              null,

            agent:
              this.mapAgent(
                currentAgentAssignment
                  ?.agent,
              ),

            agentAssignment:
              currentAgentAssignment
                ? {
                    id:
                      currentAgentAssignment.id,

                    source:
                      currentAgentAssignment.source,

                    assignedAt:
                      currentAgentAssignment.assignedAt,
                  }
                : null,

            createdAt:
              row.createdAt,

            updatedAt:
              row.updatedAt,
          };
        },
      ),

      pagination: {
        page,
        limit,
        total,

        totalPages:
          Math.ceil(
            total / limit,
          ),
      },

      filters: {
        dateFilter,
        status:
          status ?? "ALL",
        statusGroup,
        search,
      },
    };
  }

  async getOrder(
    vendorId: number,
    orderNumberInput: unknown,
  ) {
    const orderNumber =
      this.normalizeOrderNumber(
        orderNumberInput,
      );

    const order =
      await this.prisma.sellOrder.findFirst({
        where: {
          orderNumber,
          currentVendorId:
            vendorId,
        },

        select: {
          id: true,
          orderNumber: true,

          productId: true,
          variantId: true,

          productName: true,
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
              createdAt:
                "asc",
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
              createdAt:
                "desc",
            },

            select: {
              id: true,

              oldPickupDate:
                true,

              newPickupDate:
                true,

              oldSlotLabel:
                true,

              newSlotLabel:
                true,

              createdAt: true,
            },
          },

          vendorAssignments: {
            where: {
              vendorId,
            },

            orderBy: {
              assignedAt:
                "desc",
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

          agentAssignments: {
            where: {
              vendorId,
            },

            orderBy: [
              {
                assignedAt:
                  "desc",
              },
              {
                id: "desc",
              },
            ],

            select: {
              id: true,
              source: true,
              assignedAt: true,
              unassignedAt: true,
              unassignmentReason:
                true,

              agent: {
                select:
                  AGENT_SUMMARY_SELECT,
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

    const deviceReport =
      await this.buildDeviceReport(
        order.questionnaireSnapshot,
      );

    const currentAgentAssignment =
      order.agentAssignments.find(
        (assignment) =>
          assignment.unassignedAt ===
          null,
      ) ?? null;

    return {
      id:
        order.id,

      orderNumber:
        order.orderNumber,

      product: {
        id:
          order.productId,

        variantId:
          order.variantId,

        name:
          order.productName,

        variant:
          order.variantLabel,
      },

      pricing: {
        basePrice:
          order.basePrice,

        totalDeduction:
          order.totalDeduction,

        finalPrice:
          order.finalPrice,
      },

      questionnaire:
        order.questionnaireSnapshot,

      deviceReport,

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
                order
                  .addressSnapshot
                  .fullName,

              phone:
                order
                  .addressSnapshot
                  .phone,
            }
          : null,

      address:
        order.addressSnapshot,

      statusHistory:
        order.statusHistory,

      reschedules:
        order.reschedules,

      /*
       * Existing vendor-routing history.
       * Kept unchanged for compatibility.
       */
      assignmentHistory:
        order.vendorAssignments,

      /*
       * Separate agent-assignment history.
       * Never mix this with vendor routing.
       */
      agentAssignmentHistory:
        order.agentAssignments.map(
          (assignment) => ({
            id:
              assignment.id,

            source:
              assignment.source,

            assignedAt:
              assignment.assignedAt,

            unassignedAt:
              assignment.unassignedAt,

            unassignmentReason:
              assignment.unassignmentReason,

            agent:
              this.mapAgent(
                assignment.agent,
              ),
          }),
        ),

      agent:
        this.mapAgent(
          currentAgentAssignment
            ?.agent,
        ),

      agentAssignment:
        currentAgentAssignment
          ? {
              id:
                currentAgentAssignment.id,

              source:
                currentAgentAssignment.source,

              assignedAt:
                currentAgentAssignment.assignedAt,
            }
          : null,

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
      currentVendorId:
        vendorId,

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
              updatedAt:
                "desc",
            },
            {
              id: "desc",
            },
          ],

          select: {
            id: true,
            orderNumber: true,

            productName: true,
            variantLabel: true,

            finalPrice: true,

            status: true,
            pickupDate: true,

            createdAt: true,

            pickupSlot: {
              select: {
                label: true,
              },
            },

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
                unassignedAt:
                  null,
              },

              orderBy: {
                assignedAt:
                  "desc",
              },

              take: 1,

              select: {
                assignedAt:
                  true,
              },
            },

            agentAssignments: {
              where: {
                vendorId,
                unassignedAt:
                  null,
              },

              orderBy: [
                {
                  assignedAt:
                    "desc",
                },
                {
                  id: "desc",
                },
              ],

              take: 1,

              select: {
                agent: {
                  select:
                    AGENT_SUMMARY_SELECT,
                },
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

    const getCount = (
      statuses:
        SellOrderStatus[],
    ) =>
      statuses.reduce(
        (total, status) =>
          total +
          Number(
            statusCounts[
              status
            ] ?? 0,
          ),
        0,
      );

    return {
      dateFilter,

      totalAssigned,

      statusCounts,

      statusGroups: {
        pending:
          getCount(
            STATUS_GROUPS.PENDING,
          ),

        inProcess:
          getCount(
            STATUS_GROUPS.IN_PROCESS,
          ),

        completed:
          getCount(
            STATUS_GROUPS.COMPLETED,
          ),

        cancelled:
          getCount(
            STATUS_GROUPS.CANCELLED,
          ),
      },

      recentOrders:
        recentOrders.map(
          (order) => ({
            id:
              order.id,

            orderNumber:
              order.orderNumber,

            productName:
              order.productName,

            variantLabel:
              order.variantLabel,

            finalPrice:
              order.finalPrice,

            status:
              order.status,

            pickupDate:
              order.pickupDate,

            pickupSlotLabel:
              order.pickupSlot
                ?.label ??
              null,

            customerName:
              order
                .addressSnapshot
                ?.fullName ??
              null,

            location:
              order.addressSnapshot
                ? {
                    city:
                      order
                        .addressSnapshot
                        .city,

                    pincode:
                      order
                        .addressSnapshot
                        .pincode,
                  }
                : null,

            assignedAt:
              order
                .vendorAssignments[0]
                ?.assignedAt ??
              null,

            agent:
              this.mapAgent(
                order
                  .agentAssignments[0]
                  ?.agent,
              ),

            createdAt:
              order.createdAt,
          }),
        ),
    };
  }
}