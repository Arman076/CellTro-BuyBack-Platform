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

type RuleScope =
  | 'GLOBAL'
  | 'CATEGORY'
  | 'BRAND'
  | 'SERIES'
  | 'PRODUCT'
  | 'VARIANT';

type DeductionType = 'PERCENTAGE' | 'FIXED';

type ScopedRulePayload = {
  itemId: number;
  optionId: number;
  scope: RuleScope;
  targetId?: number | null;
  deductionType: DeductionType;
  deductionValue: number;
  priority?: number;
};

@Injectable()
export class QuestionnaireDeductionService {
  constructor(private readonly prisma: PrismaService) {}

  async getRules(itemId?: number, optionId?: number) {
    return this.prisma.questionnaireDeductionRule.findMany({
      where: {
        isActive: true,
        ...(optionId ? { optionId } : {}),
        ...(itemId ? { option: { itemId } } : {}),
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
        category: true,
        brand: true,
        series: true,
        product: {
          include: {
            brand: true,
            category: true,
            series: true,
          },
        },
        variant: {
          include: {
            product: true,
            values: {
              include: {
                attribute: true,
                option: true,
              },
            },
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' },
      ],
    });
  }

  async createOrUpdateScopedRule(data: ScopedRulePayload) {
    const itemId = Number(data.itemId);
    const optionId = Number(data.optionId);
    const scope = data.scope;
    const deductionType = data.deductionType;
    const deductionValue = Number(data.deductionValue);
    const priority = Number(data.priority ?? 0);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      throw new BadRequestException('Invalid questionnaire item');
    }

    if (!Number.isInteger(optionId) || optionId <= 0) {
      throw new BadRequestException('Invalid questionnaire option');
    }

    if (
      !['GLOBAL', 'CATEGORY', 'BRAND', 'SERIES', 'PRODUCT', 'VARIANT'].includes(
        scope,
      )
    ) {
      throw new BadRequestException('Invalid deduction rule scope');
    }

    if (!['PERCENTAGE', 'FIXED'].includes(deductionType)) {
      throw new BadRequestException('Invalid deduction type');
    }

    if (!Number.isFinite(deductionValue) || deductionValue < 0) {
      throw new BadRequestException(
        'Deduction value must be zero or greater',
      );
    }

    if (deductionType === 'PERCENTAGE' && deductionValue > 100) {
      throw new BadRequestException(
        'Percentage deduction must be between 0 and 100',
      );
    }

    if (!Number.isInteger(priority) || priority < 0 || priority > 1000) {
      throw new BadRequestException('Priority must be between 0 and 1000');
    }

    const option = await this.prisma.questionnaireOption.findUnique({
      where: { id: optionId },
      include: {
        item: {
          include: {
            productMappings: true,
          },
        },
      },
    });

    if (!option) {
      throw new NotFoundException('Questionnaire option not found');
    }

    if (option.itemId !== itemId) {
      throw new BadRequestException(
        'Selected option does not belong to the selected questionnaire item',
      );
    }

    if (!option.isActive || !option.item.isActive) {
      throw new BadRequestException(
        'Inactive questionnaire item or option cannot receive rules',
      );
    }

    const targetId =
      scope === 'GLOBAL'
        ? null
        : Number(data.targetId);

    if (scope !== 'GLOBAL') {
      if (!Number.isInteger(targetId) || Number(targetId) <= 0) {
        throw new BadRequestException(
          `A valid target is required for ${scope} scope`,
        );
      }
    }

    const targetData = await this.validateScopeTarget(
      scope,
      targetId,
      option.item.applyToAllProducts,
      option.item.productMappings.map((m) => m.productId),
    );

    const where = this.ruleWhere(optionId, scope, targetId);

    const existing =
      await this.prisma.questionnaireDeductionRule.findFirst({
        where,
      });

    const legacyPercent =
      deductionType === 'PERCENTAGE' ? deductionValue : 0;

    if (existing) {
      return this.prisma.questionnaireDeductionRule.update({
        where: { id: existing.id },
        data: {
          ...targetData,
          scope,
          deductionType,
          deductionValue,
          deductionPercent: legacyPercent,
          priority,
          isActive: true,
        },
        include: {
          category: true,
          brand: true,
          series: true,
          product: true,
          variant: true,
          option: true,
        },
      });
    }

    return this.prisma.questionnaireDeductionRule.create({
      data: {
        optionId,
        scope,
        ...targetData,
        deductionType,
        deductionValue,
        deductionPercent: legacyPercent,
        priority,
        isActive: true,
      },
      include: {
        category: true,
        brand: true,
        series: true,
        product: true,
        variant: true,
        option: true,
      },
    });
  }

  async bulkCreateOrUpdate(data: BulkDeductionPayload) {
    const itemId = Number(data.itemId);
    const optionId = Number(data.optionId);

    const productIds = [
      ...new Set(
        (data.productIds || [])
          .map(Number)
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

    const option = await this.prisma.questionnaireOption.findUnique({
      where: { id: optionId },
      include: {
        item: {
          include: {
            productMappings: true,
          },
        },
      },
    });

    if (!option) {
      throw new NotFoundException('Questionnaire option not found');
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
        id: { in: productIds },
        isActive: true,
      },
      select: { id: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException(
        'One or more selected products do not exist or are inactive',
      );
    }

    if (!option.item.applyToAllProducts) {
      const allowedProductIds = new Set<number>(
        option.item.productMappings.map((mapping) => mapping.productId),
      );

      if (productIds.some((id) => !allowedProductIds.has(id))) {
        throw new BadRequestException(
          'One or more selected products are not mapped to this questionnaire item',
        );
      }
    }

    const existingRules =
      await this.prisma.questionnaireDeductionRule.findMany({
        where: {
          optionId,
          scope: 'PRODUCT',
          productId: { in: productIds },
        },
        select: {
          id: true,
          productId: true,
        },
      });

    const existingProductIds = new Set<number>(
      existingRules
        .map((rule) => rule.productId)
        .filter((productId): productId is number => productId !== null),
    );

    const newProductIds = productIds.filter(
      (productId) => !existingProductIds.has(productId),
    );

    const existingIds = [...existingProductIds];
    const operations = [];

    if (newProductIds.length) {
      operations.push(
        this.prisma.questionnaireDeductionRule.createMany({
          data: newProductIds.map((productId) => ({
            optionId,
            scope: 'PRODUCT' as const,
            productId,
            deductionPercent,
            deductionType: 'PERCENTAGE' as const,
            deductionValue: deductionPercent,
            priority: 0,
            isActive: true,
          })),
          skipDuplicates: true,
        }),
      );
    }

    if (data.updateExisting === true && existingIds.length) {
      operations.push(
        this.prisma.questionnaireDeductionRule.updateMany({
          where: {
            optionId,
            scope: 'PRODUCT',
            productId: { in: existingIds },
          },
          data: {
            deductionPercent,
            deductionType: 'PERCENTAGE',
            deductionValue: deductionPercent,
            isActive: true,
          },
        }),
      );
    }

    if (operations.length) {
      await this.prisma.$transaction(operations);
    }

    return {
      selected: productIds.length,
      created: newProductIds.length,
      existing: existingIds.length,
      updated: data.updateExisting === true ? existingIds.length : 0,
      skipped: data.updateExisting === true ? 0 : existingIds.length,
    };
  }

  async updateRule(id: number, deductionPercent: number) {
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
        where: { id: ruleId },
      });

    if (!existing) {
      throw new NotFoundException('Deduction rule not found');
    }

    return this.prisma.questionnaireDeductionRule.update({
      where: { id: ruleId },
      data: {
        deductionPercent: percentage,
        deductionType: 'PERCENTAGE',
        deductionValue: percentage,
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
        where: { id: ruleId },
      });

    if (!existing) {
      throw new NotFoundException('Deduction rule not found');
    }

    return this.prisma.questionnaireDeductionRule.update({
      where: { id: ruleId },
      data: { isActive: false },
    });
  }

  private ruleWhere(
    optionId: number,
    scope: RuleScope,
    targetId: number | null,
  ) {
    if (scope === 'GLOBAL') {
      return {
        optionId,
        scope,
        categoryId: null,
        brandId: null,
        seriesId: null,
        productId: null,
        variantId: null,
      };
    }

    const targetField = {
      CATEGORY: 'categoryId',
      BRAND: 'brandId',
      SERIES: 'seriesId',
      PRODUCT: 'productId',
      VARIANT: 'variantId',
    }[scope];

    return {
      optionId,
      scope,
      [targetField]: targetId,
    };
  }

  private async validateScopeTarget(
    scope: RuleScope,
    targetId: number | null,
    applyToAllProducts: boolean,
    mappedProductIds: number[],
  ) {
    if (scope === 'GLOBAL') {
      return {
        categoryId: null,
        brandId: null,
        seriesId: null,
        productId: null,
        variantId: null,
      };
    }

    const id = Number(targetId);

    if (scope === 'CATEGORY') {
      const target = await this.prisma.category.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!target) throw new NotFoundException('Category not found');
      return {
        categoryId: id,
        brandId: null,
        seriesId: null,
        productId: null,
        variantId: null,
      };
    }

    if (scope === 'BRAND') {
      const target = await this.prisma.brand.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!target) throw new NotFoundException('Brand not found');
      return {
        categoryId: null,
        brandId: id,
        seriesId: null,
        productId: null,
        variantId: null,
      };
    }

    if (scope === 'SERIES') {
      const target = await this.prisma.productSeries.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!target) throw new NotFoundException('Series not found');
      return {
        categoryId: null,
        brandId: null,
        seriesId: id,
        productId: null,
        variantId: null,
      };
    }

    if (scope === 'PRODUCT') {
      const target = await this.prisma.product.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!target) throw new NotFoundException('Product/model not found');

      if (!applyToAllProducts && !mappedProductIds.includes(id)) {
        throw new BadRequestException(
          'This question is not mapped to the selected product/model',
        );
      }

      return {
        categoryId: null,
        brandId: null,
        seriesId: null,
        productId: id,
        variantId: null,
      };
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      select: {
        id: true,
        productId: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    if (
      !applyToAllProducts &&
      !mappedProductIds.includes(variant.productId)
    ) {
      throw new BadRequestException(
        'This question is not mapped to the selected variant model',
      );
    }

    return {
      categoryId: null,
      brandId: null,
      seriesId: null,
      productId: null,
      variantId: id,
    };
  }
}
