import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

type AnswerType = 'YES_NO' | 'SINGLE_SELECT' | 'MULTI_SELECT';
type DeductionType = 'PERCENTAGE' | 'FIXED';
type DeductionTrigger = 'SELECTED' | 'MISSING';

type OptionPayload = {
  label: string;
  value: string;
  issueCode?: string | null;
  deductionPercent?: number;
  deductionType?: DeductionType;
  deductionValue?: number;
  deductionTrigger?: DeductionTrigger;
  capabilityIds?: number[];
  displayOrder?: number;
  isActive?: boolean;
};

@Injectable()
export class QuestionnaireService {
  constructor(private readonly prisma: PrismaService) {}

  async getAudiences() {
    return this.prisma.questionnaireAudience.findMany({
      orderBy: { displayOrder: 'asc' },
    });
  }

  async createAudience(data: {
    code: string;
    name: string;
    displayOrder?: number;
    isActive?: boolean;
  }) {
    const code = this.normalizeCode(data.code);

    if (!code || !data.name?.trim()) {
      throw new BadRequestException('Audience code and name are required');
    }

    const existing =
      await this.prisma.questionnaireAudience.findUnique({
        where: { code },
      });

    if (existing) {
      throw new BadRequestException('Audience code already exists');
    }

    return this.prisma.questionnaireAudience.create({
      data: {
        code,
        name: data.name.trim(),
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  async getSections() {
    return this.prisma.questionnaireSection.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { items: true } },
      },
    });
  }

  async createSection(data: {
    code: string;
    name: string;
    displayOrder?: number;
    isActive?: boolean;
    calculationMode?: 'MAX' | 'SUM' | 'SINGLE';
  }) {
    const code = this.normalizeCode(data.code);

    if (!code || !data.name?.trim()) {
      throw new BadRequestException('Section code and name are required');
    }

    const existing =
      await this.prisma.questionnaireSection.findUnique({
        where: { code },
      });

    if (existing) {
      throw new BadRequestException('Section code already exists');
    }

    return this.prisma.questionnaireSection.create({
      data: {
        code,
        name: data.name.trim(),
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
        calculationMode: data.calculationMode ?? 'SUM',
      },
    });
  }

  async getQuestions(filters?: {
    categoryId?: number;
    sectionId?: number;
    audienceId?: number;
    productId?: number;
  }) {
    return this.prisma.questionnaireItem.findMany({
      where: {
        ...(filters?.categoryId
          ? { categoryId: filters.categoryId }
          : {}),
        ...(filters?.sectionId
          ? { sectionId: filters.sectionId }
          : {}),
        ...(filters?.audienceId
          ? {
              audiences: {
                some: { audienceId: filters.audienceId },
              },
            }
          : {}),
        ...(filters?.productId
          ? {
              OR: [
                { applyToAllProducts: true },
                {
                  productMappings: {
                    some: { productId: filters.productId },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [
        { section: { displayOrder: 'asc' } },
        { displayOrder: 'asc' },
      ],
      include: this.questionInclude(),
    });
  }

  async getQuestion(id: number) {
    const question =
      await this.prisma.questionnaireItem.findUnique({
        where: { id },
        include: this.questionInclude(),
      });

    if (!question) {
      throw new NotFoundException('Question does not exist');
    }

    return question;
  }

  async createQuestion(data: {
    code: string;
    name: string;
    questionText: string;
    answerType: AnswerType;
    sectionId: number;
    categoryId?: number | null;
    displayOrder?: number;
    isRequired?: boolean;
    isActive?: boolean;
    applyToAllProducts?: boolean;
    audienceIds: number[];
    productIds?: number[];
    options: OptionPayload[];
  }) {
    const code = this.normalizeCode(data.code);

    if (!code) {
      throw new BadRequestException('Question code is required');
    }

    const duplicate =
      await this.prisma.questionnaireItem.findUnique({
        where: { code },
      });

    if (duplicate) {
      throw new BadRequestException('Question code already exists');
    }

    await this.validateQuestionMasterData(data);

    const applyToAllProducts = data.applyToAllProducts ?? true;

    return this.prisma.questionnaireItem.create({
      data: {
        code,
        name: data.name.trim(),
        questionText: data.questionText.trim(),
        answerType: data.answerType,
        sectionId: Number(data.sectionId),
        categoryId: data.categoryId ?? null,
        displayOrder: data.displayOrder ?? 0,
        isRequired: data.isRequired ?? true,
        isActive: data.isActive ?? true,
        applyToAllProducts,

        audiences: {
          create: this.cleanIds(data.audienceIds).map((audienceId) => ({
            audienceId,
          })),
        },

        productMappings:
          !applyToAllProducts
            ? {
                create: this.cleanIds(data.productIds || []).map(
                  (productId) => ({ productId }),
                ),
              }
            : undefined,

        options: {
          create: data.options.map((option, index) => {
            const deduction = this.normalizeOptionDeduction(option);

            return {
              label: option.label.trim(),
              value: this.normalizeCode(option.value),
              issueCode: option.issueCode
                ? this.normalizeCode(option.issueCode)
                : this.normalizeCode(`${code}_${option.value}`),

              deductionPercent:
                deduction.type === 'PERCENTAGE'
                  ? deduction.value
                  : 0,

              deductionType: deduction.type,
              deductionValue: deduction.value,
              deductionTrigger: option.deductionTrigger ?? 'SELECTED',

              displayOrder: option.displayOrder ?? index + 1,
              isActive: option.isActive ?? true,

              capabilities: option.capabilityIds?.length
                ? {
                    create: this.cleanIds(option.capabilityIds).map(
                      (capabilityId) => ({ capabilityId }),
                    ),
                  }
                : undefined,
            };
          }),
        },
      },
      include: this.questionInclude(),
    });
  }

  async updateQuestion(
    id: number,
    data: {
      name?: string;
      questionText?: string;
      answerType?: AnswerType;
      sectionId?: number;
      categoryId?: number | null;
      displayOrder?: number;
      isRequired?: boolean;
      isActive?: boolean;
      applyToAllProducts?: boolean;
      audienceIds?: number[];
      productIds?: number[];
    },
  ) {
    const existing =
      await this.prisma.questionnaireItem.findUnique({
        where: { id },
      });

    if (!existing) {
      throw new NotFoundException('Question does not exist');
    }

    if (data.sectionId !== undefined) {
      await this.ensureSection(data.sectionId);
    }

    if (data.categoryId !== undefined && data.categoryId !== null) {
      await this.ensureCategory(data.categoryId);
    }

    if (data.audienceIds !== undefined) {
      await this.validateAudiences(data.audienceIds);
    }

    const finalCategoryId =
      data.categoryId !== undefined
        ? data.categoryId
        : existing.categoryId;

    if (data.productIds !== undefined) {
      await this.validateProducts(
        data.productIds,
        finalCategoryId ?? undefined,
      );
    }

    const finalApplyToAll =
      data.applyToAllProducts ?? existing.applyToAllProducts;

    if (
      finalApplyToAll === false &&
      data.applyToAllProducts === false &&
      data.productIds !== undefined &&
      !data.productIds.length
    ) {
      throw new BadRequestException(
        'Select at least one product when Apply To All Products is disabled',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.audienceIds !== undefined) {
        await tx.questionnaireItemAudience.deleteMany({
          where: { itemId: id },
        });

        const audienceIds = this.cleanIds(data.audienceIds);

        if (audienceIds.length) {
          await tx.questionnaireItemAudience.createMany({
            data: audienceIds.map((audienceId) => ({
              itemId: id,
              audienceId,
            })),
            skipDuplicates: true,
          });
        }
      }

      if (
        data.productIds !== undefined ||
        data.applyToAllProducts === true
      ) {
        await tx.questionnaireItemProduct.deleteMany({
          where: { itemId: id },
        });

        if (
          finalApplyToAll === false &&
          data.productIds?.length
        ) {
          await tx.questionnaireItemProduct.createMany({
            data: this.cleanIds(data.productIds).map((productId) => ({
              itemId: id,
              productId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.questionnaireItem.update({
        where: { id },
        data: {
          ...(data.name !== undefined
            ? { name: data.name.trim() }
            : {}),
          ...(data.questionText !== undefined
            ? { questionText: data.questionText.trim() }
            : {}),
          ...(data.answerType !== undefined
            ? { answerType: data.answerType }
            : {}),
          ...(data.sectionId !== undefined
            ? { sectionId: data.sectionId }
            : {}),
          ...(data.categoryId !== undefined
            ? { categoryId: data.categoryId }
            : {}),
          ...(data.displayOrder !== undefined
            ? { displayOrder: data.displayOrder }
            : {}),
          ...(data.isRequired !== undefined
            ? { isRequired: data.isRequired }
            : {}),
          ...(data.isActive !== undefined
            ? { isActive: data.isActive }
            : {}),
          ...(data.applyToAllProducts !== undefined
            ? { applyToAllProducts: data.applyToAllProducts }
            : {}),
        },
        include: this.questionInclude(),
      });
    });
  }

  async removeQuestion(id: number) {
    await this.getQuestion(id);

    // Preserve old behavior for the current admin UI.
    await this.prisma.questionnaireItem.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Question deleted successfully',
    };
  }

  async addOption(questionId: number, data: OptionPayload) {
    await this.getQuestion(questionId);

    if (!data.label?.trim() || !data.value?.trim()) {
      throw new BadRequestException('Option label and value are required');
    }

    const value = this.normalizeCode(data.value);

    const existing =
      await this.prisma.questionnaireOption.findFirst({
        where: { itemId: questionId, value },
      });

    if (existing) {
      throw new BadRequestException(
        'Option already exists for this question',
      );
    }

    await this.validateCapabilities(data.capabilityIds || []);

    const deduction = this.normalizeOptionDeduction(data);

    return this.prisma.questionnaireOption.create({
      data: {
        itemId: questionId,
        label: data.label.trim(),
        value,
        issueCode: data.issueCode
          ? this.normalizeCode(data.issueCode)
          : this.normalizeCode(`${questionId}_${value}`),

        deductionPercent:
          deduction.type === 'PERCENTAGE' ? deduction.value : 0,

        deductionType: deduction.type,
        deductionValue: deduction.value,
        deductionTrigger: data.deductionTrigger ?? 'SELECTED',
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,

        capabilities: data.capabilityIds?.length
          ? {
              create: this.cleanIds(data.capabilityIds).map(
                (capabilityId) => ({ capabilityId }),
              ),
            }
          : undefined,
      },
      include: {
        capabilities: {
          include: { capability: true },
        },
      },
    });
  }

  async updateOption(
    optionId: number,
    data: Partial<OptionPayload>,
  ) {
    const option =
      await this.prisma.questionnaireOption.findUnique({
        where: { id: optionId },
      });

    if (!option) {
      throw new NotFoundException(
        'Question option does not exist',
      );
    }

    if (data.capabilityIds !== undefined) {
      await this.validateCapabilities(data.capabilityIds);
    }

    let deductionData = {};

    if (
      data.deductionValue !== undefined ||
      data.deductionPercent !== undefined ||
      data.deductionType !== undefined
    ) {
      const normalized = this.normalizeOptionDeduction({
  deductionType: data.deductionType ?? option.deductionType,
  deductionValue:
    data.deductionValue !== undefined
      ? data.deductionValue
      : data.deductionPercent !== undefined
        ? data.deductionPercent
        : Number(option.deductionValue),
  deductionPercent: data.deductionPercent,
});

      deductionData = {
        deductionType: normalized.type,
        deductionValue: normalized.value,
        deductionPercent:
          normalized.type === 'PERCENTAGE'
            ? normalized.value
            : 0,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.capabilityIds !== undefined) {
        await tx.questionnaireOptionCapability.deleteMany({
          where: { optionId },
        });

        const ids = this.cleanIds(data.capabilityIds);

        if (ids.length) {
          await tx.questionnaireOptionCapability.createMany({
            data: ids.map((capabilityId) => ({
              optionId,
              capabilityId,
            })),
            skipDuplicates: true,
          });
        }
      }

      return tx.questionnaireOption.update({
        where: { id: optionId },
        data: {
          ...(data.label !== undefined
            ? { label: data.label.trim() }
            : {}),
          ...(data.value !== undefined
            ? { value: this.normalizeCode(data.value) }
            : {}),
          ...(data.issueCode !== undefined
            ? {
                issueCode: data.issueCode
                  ? this.normalizeCode(data.issueCode)
                  : null,
              }
            : {}),
          ...deductionData,
          ...(data.deductionTrigger !== undefined
            ? { deductionTrigger: data.deductionTrigger }
            : {}),
          ...(data.displayOrder !== undefined
            ? { displayOrder: data.displayOrder }
            : {}),
          ...(data.isActive !== undefined
            ? { isActive: data.isActive }
            : {}),
        },
        include: {
          capabilities: {
            include: { capability: true },
          },
        },
      });
    });
  }

  async removeOption(optionId: number) {
    const option =
      await this.prisma.questionnaireOption.findUnique({
        where: { id: optionId },
      });

    if (!option) {
      throw new NotFoundException(
        'Question option does not exist',
      );
    }

    await this.prisma.questionnaireOption.delete({
      where: { id: optionId },
    });

    return {
      success: true,
      message: 'Option deleted successfully',
    };
  }

  async addCondition(itemId: number, dependsOnOptionId: number) {
    await this.getQuestion(itemId);

    const option =
      await this.prisma.questionnaireOption.findUnique({
        where: { id: dependsOnOptionId },
      });

    if (!option) {
      throw new BadRequestException('Parent option does not exist');
    }

    const existing =
      await this.prisma.questionnaireCondition.findUnique({
        where: {
          itemId_dependsOnOptionId: {
            itemId,
            dependsOnOptionId,
          },
        },
      });

    if (existing) {
      throw new BadRequestException('Condition already exists');
    }

    return this.prisma.questionnaireCondition.create({
      data: { itemId, dependsOnOptionId },
    });
  }

  async removeCondition(id: number) {
    const condition =
      await this.prisma.questionnaireCondition.findUnique({
        where: { id },
      });

    if (!condition) {
      throw new NotFoundException('Condition does not exist');
    }

    await this.prisma.questionnaireCondition.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Condition removed',
    };
  }

  private questionInclude() {
    return {
      section: true,
      category: true,
      options: {
        orderBy: { displayOrder: 'asc' as const },
        include: {
          capabilities: {
            include: { capability: true },
          },
        },
      },
      audiences: {
        include: { audience: true },
      },
      productMappings: {
        include: {
          product: {
            include: {
              brand: true,
              category: true,
              series: true,
            },
          },
        },
      },
      conditions: {
        include: {
          dependsOnOption: {
            include: { item: true },
          },
        },
      },
    };
  }

  private normalizeCode(value: string) {
    return String(value || '')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private cleanIds(ids: number[]) {
    return [
      ...new Set(
        (ids || [])
          .map(Number)
          .filter((id) => Number.isInteger(id) && id > 0),
      ),
    ];
  }

  private normalizeOptionDeduction(data: {
    deductionType?: DeductionType;
    deductionValue?: number;
    deductionPercent?: number;
  }) {
    const type = data.deductionType ?? 'PERCENTAGE';

    const rawValue =
      data.deductionValue !== undefined
        ? data.deductionValue
        : data.deductionPercent ?? 0;

    const value = Number(rawValue);

    if (!Number.isFinite(value) || value < 0) {
      throw new BadRequestException(
        'Deduction value must be zero or greater',
      );
    }

    if (type === 'PERCENTAGE' && value > 100) {
      throw new BadRequestException(
        'Percentage deduction must be between 0 and 100',
      );
    }

    return { type, value };
  }

  private async validateQuestionMasterData(data: {
    sectionId: number;
    categoryId?: number | null;
    audienceIds: number[];
    productIds?: number[];
    applyToAllProducts?: boolean;
    options: OptionPayload[];
    name: string;
    questionText: string;
  }) {
    if (!data.name?.trim() || !data.questionText?.trim()) {
      throw new BadRequestException(
        'Question name and question text are required',
      );
    }

    await this.ensureSection(data.sectionId);

    if (data.categoryId) {
      await this.ensureCategory(data.categoryId);
    }

    await this.validateAudiences(data.audienceIds);

    if (!data.options?.length) {
      throw new BadRequestException(
        'At least one answer option is required',
      );
    }

    const normalizedOptions = data.options.map((option) =>
      this.normalizeCode(option.value),
    );

    if (
      normalizedOptions.some((value) => !value) ||
      new Set(normalizedOptions).size !== normalizedOptions.length
    ) {
      throw new BadRequestException(
        'Option values are required and must be unique',
      );
    }

    for (const option of data.options) {
      if (!option.label?.trim()) {
        throw new BadRequestException('Option label is required');
      }

      this.normalizeOptionDeduction(option);
      await this.validateCapabilities(option.capabilityIds || []);
    }

    if (data.applyToAllProducts === false) {
      if (!data.productIds?.length) {
        throw new BadRequestException(
          'Select at least one product when Apply To All Products is disabled',
        );
      }

      await this.validateProducts(
        data.productIds,
        data.categoryId ?? undefined,
      );
    }
  }

  private async validateAudiences(audienceIds: number[]) {
    const ids = this.cleanIds(audienceIds);

    if (!ids.length) {
      throw new BadRequestException(
        'At least one audience is required',
      );
    }

    if (ids.length !== audienceIds.length) {
      throw new BadRequestException(
        'Duplicate or invalid audience is not allowed',
      );
    }

    const count =
      await this.prisma.questionnaireAudience.count({
        where: {
          id: { in: ids },
          isActive: true,
        },
      });

    if (count !== ids.length) {
      throw new BadRequestException(
        'One or more selected audiences are invalid',
      );
    }
  }

  private async validateProducts(
    productIds: number[],
    categoryId?: number,
  ) {
    const ids = this.cleanIds(productIds);

    if (ids.length !== productIds.length) {
      throw new BadRequestException(
        'Duplicate or invalid product mapping is not allowed',
      );
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, categoryId: true },
    });

    if (products.length !== ids.length) {
      throw new BadRequestException(
        'One or more selected products do not exist',
      );
    }

    if (
      categoryId &&
      products.some((product) => product.categoryId !== categoryId)
    ) {
      throw new BadRequestException(
        'Selected product does not belong to the selected category',
      );
    }
  }

  private async validateCapabilities(capabilityIds: number[]) {
    const ids = this.cleanIds(capabilityIds);

    if (!ids.length) return;

    if (ids.length !== capabilityIds.length) {
      throw new BadRequestException(
        'Duplicate or invalid capability is not allowed',
      );
    }

    const count = await this.prisma.deviceCapability.count({
      where: {
        id: { in: ids },
        isActive: true,
      },
    });

    if (count !== ids.length) {
      throw new BadRequestException(
        'One or more selected capabilities are invalid',
      );
    }
  }

  private async ensureSection(sectionId: number) {
    const section =
      await this.prisma.questionnaireSection.findUnique({
        where: { id: Number(sectionId) },
      });

    if (!section) {
      throw new BadRequestException(
        'Selected questionnaire section does not exist',
      );
    }
  }

  private async ensureCategory(categoryId: number) {
    const category = await this.prisma.category.findUnique({
      where: { id: Number(categoryId) },
    });

    if (!category) {
      throw new BadRequestException(
        'Selected category does not exist',
      );
    }
  }
}
