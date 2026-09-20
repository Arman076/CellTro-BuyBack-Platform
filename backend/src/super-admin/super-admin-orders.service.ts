import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import {
  PrismaService,
} from "../prisma/prisma/prisma.service.js";

type GetOrdersInput = {
  search?: string;
  status?: string;
  statusGroup?: string;
  from?: string;
  to?: string;
  page?: string;
  limit?: string;
};

type QuestionnaireSnapshotAnswer = {
  itemId?: unknown;
  optionId?: unknown;
  optionIds?: unknown;
  childOptionIds?: unknown;
};

const VALID_STATUSES = new Set([
  "PICKUP_REQUESTED",
  "PICKUP_CONFIRMED",
  "PICKUP_STARTED",
  "INSPECTION_COMPLETED",
  "PAYMENT_COMPLETED",
  "COMPLETED",
  "CANCELLED",
]);


const PENDING_STATUSES = [
  "PICKUP_REQUESTED",
  "PICKUP_CONFIRMED",
  "PICKUP_STARTED",
  "INSPECTION_COMPLETED",
  "PAYMENT_COMPLETED",
] as const;

const VALID_STATUS_GROUPS =
  new Set([
    "PENDING",
    "COMPLETED",
    "CANCELLED",
  ]);

@Injectable()
export class SuperAdminOrdersService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  private toNumber(
    value: unknown,
  ): number {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : 0;
  }

  private positiveInteger(
    value: unknown,
    fallback: number,
    maximum: number,
  ) {
    const parsed =
      Number.parseInt(
        String(value ?? ""),
        10,
      );

    if (
      !Number.isFinite(parsed) ||
      parsed <= 0
    ) {
      return fallback;
    }

    return Math.min(
      parsed,
      maximum,
    );
  }

  private parseDate(
    value: string,
    fieldName: string,
  ) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        value,
      )
    ) {
      throw new BadRequestException(
        `${fieldName} date must be YYYY-MM-DD.`,
      );
    }

    const parsed =
      new Date(
        `${value}T00:00:00.000Z`,
      );

    if (
      Number.isNaN(
        parsed.getTime(),
      )
    ) {
      throw new BadRequestException(
        `${fieldName} date is invalid.`,
      );
    }

    return parsed;
  }

  private nextUtcDay(
    value: Date,
  ) {
    const next =
      new Date(value);

    next.setUTCDate(
      next.getUTCDate() + 1,
    );

    return next;
  }

  private normalizeSnapshot(
    value: unknown,
  ): QuestionnaireSnapshotAnswer[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter(
      (
        entry,
      ): entry is QuestionnaireSnapshotAnswer =>
        Boolean(
          entry &&
            typeof entry ===
              "object",
        ),
    );
  }

  private numberArray(
    value: unknown,
  ): number[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return [
      ...new Set(
        value
          .map((item) =>
            Number(item),
          )
          .filter((item) =>
            Number.isInteger(item),
          ),
      ),
    ];
  }

  private snapshotItemId(
    value: unknown,
  ) {
    const id =
      Number(value);

    return Number.isInteger(id)
      ? id
      : null;
  }

  private snapshotSelectedIds(
    answer:
      QuestionnaireSnapshotAnswer,
  ) {
    const ids: number[] = [];

    const optionId =
      Number(answer.optionId);

    if (
      Number.isInteger(
        optionId,
      )
    ) {
      ids.push(optionId);
    }

    ids.push(
      ...this.numberArray(
        answer.optionIds,
      ),
    );

    return [...new Set(ids)];
  }

  private snapshotChildIds(
    answer:
      QuestionnaireSnapshotAnswer,
  ) {
    return this.numberArray(
      answer.childOptionIds,
    );
  }

  async getOrders(
    input: GetOrdersInput = {},
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

    const search =
      String(
        input.search ?? "",
      )
        .trim()
        .slice(0, 100);

    const status =
      String(
        input.status ?? "",
      )
        .trim()
        .toUpperCase();

    const from =
      String(
        input.from ?? "",
      ).trim();

    const to =
      String(
        input.to ?? "",
      ).trim();

    if (
      status &&
      !VALID_STATUSES.has(status)
    ) {
      throw new BadRequestException(
        "Invalid order status.",
      );
    }

    let fromDate:
      | Date
      | undefined;

    let toExclusive:
      | Date
      | undefined;

    if (from) {
      fromDate =
        this.parseDate(
          from,
          "From",
        );
    }

    if (to) {
      const toDate =
        this.parseDate(
          to,
          "To",
        );

      toExclusive =
        this.nextUtcDay(
          toDate,
        );
    }

    if (
      fromDate &&
      toExclusive &&
      fromDate >=
        toExclusive
    ) {
      throw new BadRequestException(
        "From date cannot be after To date.",
      );
    }

    const where: any = {};

    if (status) {
      where.status =
        status;
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

    if (search) {
      where.OR = [
        {
          orderNumber: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          productName: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          variantLabel: {
            contains: search,
            mode: "insensitive",
          },
        },

        {
          customer: {
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
              fullName: {
                contains:
                  search,
                mode:
                  "insensitive",
              },
            },
          },
        },
      ];
    }

    const skip =
      (page - 1) *
      limit;

    const [
      orders,
      total,
    ] =
      await this.prisma.$transaction([
        this.prisma.sellOrder.findMany({
          where,

          skip,
          take: limit,

          orderBy: [
            {
              createdAt:
                "desc",
            },
            {
              orderNumber:
                "desc",
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

            customer: {
              select: {
                id: true,
                phone: true,
              },
            },

            pickupSlot: {
              select: {
                label: true,
              },
            },

            addressSnapshot: {
              select: {
                fullName: true,
              },
            },
          },
        }),

        this.prisma.sellOrder.count({
          where,
        }),
      ]);

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          total / limit,
        ),
      );

    return {
      data: orders.map(
        (order) => ({
          ...order,

          finalPrice:
            this.toNumber(
              order.finalPrice,
            ),
        }),
      ),

      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  private async resolveQuestionnaire(
    snapshotValue: unknown,
  ) {
    const snapshot =
      this.normalizeSnapshot(
        snapshotValue,
      );

    if (
      snapshot.length === 0
    ) {
      return [];
    }

    const itemIds = [
      ...new Set(
        snapshot
          .map((answer) =>
            this.snapshotItemId(
              answer.itemId,
            ),
          )
          .filter(
            (
              id,
            ): id is number =>
              id !== null,
          ),
      ),
    ];

    const optionIds = [
      ...new Set(
        snapshot.flatMap(
          (answer) => [
            ...this.snapshotSelectedIds(
              answer,
            ),
            ...this.snapshotChildIds(
              answer,
            ),
          ],
        ),
      ),
    ];

    const [
      items,
      options,
    ] =
      await Promise.all([
        itemIds.length
          ? this.prisma.questionnaireItem.findMany({
              where: {
                id: {
                  in: itemIds,
                },
              },

              select: {
                id: true,
                questionText:
                  true,
                displayOrder:
                  true,
                section: {
                  select: {
                    id: true,
                    name: true,
                    displayOrder:
                      true,
                  },
                },
              },
            })
          : Promise.resolve([]),

        optionIds.length
          ? this.prisma.questionnaireOption.findMany({
              where: {
                id: {
                  in: optionIds,
                },
              },

              select: {
                id: true,
                itemId: true,
                parentOptionId:
                  true,
                label: true,
                value: true,
                displayOrder:
                  true,
              },
            })
          : Promise.resolve([]),
      ]);

    const itemById =
      new Map(
        items.map(
          (item) => [
            item.id,
            item,
          ],
        ),
      );

    const optionById =
      new Map(
        options.map(
          (option) => [
            option.id,
            option,
          ],
        ),
      );

    return snapshot
      .map(
        (
          answer,
          snapshotIndex,
        ) => {
          const itemId =
            this.snapshotItemId(
              answer.itemId,
            );

          if (
            itemId === null
          ) {
            return null;
          }

          const item =
            itemById.get(
              itemId,
            );

          const selectedIds =
            this.snapshotSelectedIds(
              answer,
            );

          const childIds =
            this.snapshotChildIds(
              answer,
            );

          const selectedOptions =
            selectedIds
              .map((id) =>
                optionById.get(
                  id,
                ),
              )
              .filter(
                Boolean,
              )
              .map(
                (option: any) => ({
                  id:
                    option.id,
                  label:
                    option.label,
                  value:
                    option.value,
                }),
              );

          const childOptions =
            childIds
              .map((id) =>
                optionById.get(
                  id,
                ),
              )
              .filter(
                Boolean,
              )
              .map(
                (option: any) => ({
                  id:
                    option.id,
                  label:
                    option.label,
                  value:
                    option.value,
                  parentOptionId:
                    option.parentOptionId,
                }),
              );

          return {
            itemId,

            question:
              item?.questionText ??
              "Question unavailable",

            section:
              item?.section
                ?.name ??
              null,

            selectedOptions,

            childOptions,

            /*
             * IMPORTANT:
             *
             * Historical SellOrder currently stores:
             * - questionnaireSnapshot
             * - totalDeduction
             *
             * It does NOT store immutable
             * per-answer applied deduction.
             *
             * Current pricing rules may have
             * changed after this order.
             *
             * Therefore we deliberately do not
             * fabricate a historical per-question
             * deduction here.
             */
            deductionAmount:
              null,

            deductionBreakdownAvailable:
              false,

            _sort: {
              section:
                item?.section
                  ?.displayOrder ??
                999999,

              question:
                item?.displayOrder ??
                999999,

              snapshotIndex,
            },
          };
        },
      )
      .filter(Boolean)
      .sort(
        (
          left: any,
          right: any,
        ) =>
          left._sort.section -
            right._sort.section ||
          left._sort.question -
            right._sort.question ||
          left._sort
            .snapshotIndex -
            right._sort
              .snapshotIndex,
      )
      .map(
        ({
          _sort,
          ...answer
        }: any) =>
          answer,
      );
  }

  async getOrderDetails(
    orderNumber: string,
  ) {
    const normalizedOrderNumber =
      String(
        orderNumber ?? "",
      )
        .trim()
        .slice(0, 100);

    if (
      !normalizedOrderNumber
    ) {
      throw new BadRequestException(
        "Order number is required.",
      );
    }

    const order =
      await this.prisma.sellOrder.findUnique({
        where: {
          orderNumber:
            normalizedOrderNumber,
        },

        include: {
          customer: true,

          pickupSlot: true,

          addressSnapshot:
            true,

          statusHistory: {
            orderBy: {
              createdAt:
                "asc",
            },
          },

          reschedules: {
            orderBy: {
              createdAt:
                "desc",
            },
          },

          cancellation:
            true,

          feedback:
            true,
        },
      });

    if (!order) {
      throw new NotFoundException(
        "Order not found.",
      );
    }

    const questionnaire =
      await this.resolveQuestionnaire(
        order.questionnaireSnapshot,
      );

    return {
      id: order.id,

      orderNumber:
        order.orderNumber,

      customerId:
        order.customerId,

      productId:
        order.productId,

      variantId:
        order.variantId,

      productName:
        order.productName,

      productImage:
        order.productImage,

      variantLabel:
        order.variantLabel,

      basePrice:
        this.toNumber(
          order.basePrice,
        ),

      totalDeduction:
        this.toNumber(
          order.totalDeduction,
        ),

      finalPrice:
        this.toNumber(
          order.finalPrice,
        ),

      status:
        order.status,

      pickupDate:
        order.pickupDate,

      pickupSlotId:
        order.pickupSlotId,

      payoutMethod:
        order.payoutMethod,

      payoutUpiMobile:
        order.payoutUpiMobile,

      createdAt:
        order.createdAt,

      updatedAt:
        order.updatedAt,

      customer:
        order.customer,

      pickupSlot:
        order.pickupSlot,

      addressSnapshot:
        order.addressSnapshot,

      statusHistory:
        order.statusHistory,

      reschedules:
        order.reschedules,

      cancellation:
        order.cancellation,

      feedback:
        order.feedback,

      questionnaire,

      questionnaireSummary: {
        responseCount:
          questionnaire.length,

        totalDeduction:
          this.toNumber(
            order.totalDeduction,
          ),

        perAnswerDeductionAvailable:
          false,
      },

      pdfAvailable:
        order.status ===
        "COMPLETED",
    };
  }
}