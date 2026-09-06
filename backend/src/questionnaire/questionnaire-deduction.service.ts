import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

type BulkDeductionPayload = {
  itemId: number;
  optionId: number;
  productIds: number[];
  deductionPercent: number;
  updateExisting?: boolean;
};

@Injectable()
export class QuestionnaireDeductionService {
  constructor(private readonly prisma: PrismaService) {}

  async getRules(itemId?: number, optionId?: number) {
    return this.prisma.questionnaireDeductionRule.findMany({
      where: {
        isActive: true,

        ...(optionId
          ? {
              optionId,
            }
          : {}),

        ...(itemId
          ? {
              option: {
                itemId,
              },
            }
          : {}),
      },

      include: {
        option: {
          include: {
            item: {
              include: {
                section: true,
              },
            },
          },
        },

        product: {
          include: {
            brand: true,
            category: true,
          },
        },
      },

      orderBy: [
        {
          product: {
            name: 'asc',
          },
        },
      ],
    });
  }

  async bulkCreateOrUpdate(data: BulkDeductionPayload) {
    const itemId = Number(data.itemId);
    const optionId = Number(data.optionId);

    const productIds = [
      ...new Set(
        (data.productIds || [])
          .map((id) => Number(id))
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];

    const deductionPercent = Number(data.deductionPercent);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new BadRequestException('Invalid questionnaire item');
    }

    if (!Number.isInteger(optionId) || optionId <= 0) {
      throw new BadRequestException('Invalid questionnaire option');
    }

    if (!productIds.length) {
      throw new BadRequestException(
        'Please select at least one phone/model',
      );
    }

    // Protection from very large accidental/malicious payloads
    if (productIds.length > 500) {
      throw new BadRequestException(
        'Maximum 500 products can be updated in one request',
      );
    }

    if (
      !Number.isFinite(deductionPercent) ||
      deductionPercent < 0 ||
      deductionPercent > 100
    ) {
      throw new BadRequestException(
        'Deduction percentage must be between 0 and 100',
      );
    }

    const option =
      await this.prisma.questionnaireOption.findUnique({
        where: {
          id: optionId,
        },

        include: {
          item: {
            include: {
              productMappings: true,
            },
          },
        },
      });

    if (!option) {
      throw new NotFoundException(
        'Questionnaire option not found',
      );
    }

    if (!option.isActive || !option.item.isActive) {
      throw new BadRequestException(
        'Inactive questionnaire item or option cannot receive deduction rules',
      );
    }

    if (option.itemId !== itemId) {
      throw new BadRequestException(
        'Selected option does not belong to the selected questionnaire item',
      );
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },

        isActive: true,
      },

      select: {
        id: true,
        name: true,
      },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'One or more selected products do not exist or are inactive',
      );
    }

    /*
     * Model-specific question:
     * Only models explicitly mapped to that question may receive rules.
     */
    if (!option.item.applyToAllProducts) {
      const allowedProductIds = new Set(
        option.item.productMappings.map(
          (mapping) => mapping.productId,
        ),
      );

      const invalidProducts = productIds.filter(
        (productId) => !allowedProductIds.has(productId),
      );

      if (invalidProducts.length) {
        throw new BadRequestException(
          'One or more selected products are not mapped to this questionnaire item',
        );
      }
    }

    const existingRules =
      await this.prisma.questionnaireDeductionRule.findMany({
        where: {
          optionId,

          productId: {
            in: productIds,
          },
        },

        select: {
          id: true,
          productId: true,
        },
      });

    const existingProductIds = new Set(
      existingRules.map((rule) => rule.productId),
    );

    const newProductIds = productIds.filter(
      (productId) => !existingProductIds.has(productId),
    );

    const existingIds = [...existingProductIds];

    const transactionOperations = [];

    if (newProductIds.length) {
      transactionOperations.push(
        this.prisma.questionnaireDeductionRule.createMany({
          data: newProductIds.map((productId) => ({
            optionId,
            productId,
            deductionPercent,
            isActive: true,
          })),

          skipDuplicates: true,
        }),
      );
    }

    if (
      data.updateExisting === true &&
      existingIds.length
    ) {
      transactionOperations.push(
        this.prisma.questionnaireDeductionRule.updateMany({
          where: {
            optionId,

            productId: {
              in: existingIds,
            },
          },

          data: {
            deductionPercent,
            isActive: true,
          },
        }),
      );
    }

    if (transactionOperations.length) {
      await this.prisma.$transaction(
        transactionOperations,
      );
    }

    return {
      selected: productIds.length,

      created: newProductIds.length,

      existing: existingIds.length,

      updated:
        data.updateExisting === true
          ? existingIds.length
          : 0,

      skipped:
        data.updateExisting === true
          ? 0
          : existingIds.length,
    };
  }

  async updateRule(
    id: number,
    deductionPercent: number,
  ) {
    const ruleId = Number(id);
    const percentage = Number(deductionPercent);

    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      throw new BadRequestException('Invalid rule ID');
    }

    if (
      !Number.isFinite(percentage) ||
      percentage < 0 ||
      percentage > 100
    ) {
      throw new BadRequestException(
        'Deduction percentage must be between 0 and 100',
      );
    }

    const existing =
      await this.prisma.questionnaireDeductionRule.findUnique({
        where: {
          id: ruleId,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Deduction rule not found',
      );
    }

    return this.prisma.questionnaireDeductionRule.update({
      where: {
        id: ruleId,
      },

      data: {
        deductionPercent: percentage,
      },
    });
  }

  async removeRule(id: number) {
    const ruleId = Number(id);

    if (!Number.isInteger(ruleId) || ruleId <= 0) {
      throw new BadRequestException('Invalid rule ID');
    }

    const existing =
      await this.prisma.questionnaireDeductionRule.findUnique({
        where: {
          id: ruleId,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Deduction rule not found',
      );
    }

    /*
     * Soft-disable instead of hard-delete.
     * Better for future audit/history.
     */
    return this.prisma.questionnaireDeductionRule.update({
      where: {
        id: ruleId,
      },

      data: {
        isActive: false,
      },
    });
  }
}