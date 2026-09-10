import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma/prisma.service.js';

type DeductionType = 'PERCENTAGE' | 'FIXED';
type DeductionTrigger = 'SELECTED' | 'MISSING';
type ChildSelectionMode = 'SINGLE' | 'MULTI';

type BranchOptionInput = {
  id?: number;
  label: string;
  value?: string;
  issueCode?: string | null;
  deductionType?: DeductionType;
  deductionValue?: number;
  deductionTrigger?: DeductionTrigger;
  displayOrder?: number;
  isActive?: boolean;
  capabilityIds?: number[];

  showChildOptions?: boolean;
  childPrompt?: string | null;
  requireChildSelection?: boolean;
  minChildSelections?: number;
  maxChildSelections?: number | null;
  childSelectionMode?: ChildSelectionMode;

  childOptions?: BranchOptionInput[];
};

type QuestionInput = {
  code?: string;
  name: string;
  questionText: string;
  answerType: 'YES_NO' | 'SINGLE_SELECT' | 'MULTI_SELECT';
  sectionId: number;
  categoryId?: number | null;
  displayOrder?: number;
  isRequired?: boolean;
  isActive?: boolean;
  applyToAllProducts?: boolean;
  audienceIds: number[];
  productIds?: number[];
  options: BranchOptionInput[];
};

@Injectable()
export class QuestionnaireBranchService {
  constructor(private readonly prisma: PrismaService) {}

  private normalize(value: string) {
    return value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private number(value: unknown, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private validateDeduction(
    type: DeductionType,
    value: number,
  ) {
    if (value < 0) {
      throw new BadRequestException(
        'Deduction cannot be negative',
      );
    }
    if (type === 'PERCENTAGE' && value > 100) {
      throw new BadRequestException(
        'Percentage deduction cannot exceed 100',
      );
    }
  }

  private validateBranch(option: BranchOptionInput) {
    const min = this.number(option.minChildSelections, 0);
    const max =
      option.maxChildSelections === null ||
      option.maxChildSelections === undefined
        ? null
        : this.number(option.maxChildSelections);

    if (min < 0) {
      throw new BadRequestException(
        'Minimum child selection cannot be negative',
      );
    }

    if (max !== null && max < min) {
      throw new BadRequestException(
        'Maximum child selection cannot be lower than minimum',
      );
    }
  }

  private async validateMasterData(data: QuestionInput) {
    const section =
      await this.prisma.questionnaireSection.findUnique({
        where: { id: Number(data.sectionId) },
      });

    if (!section) {
      throw new BadRequestException(
        'Questionnaire section does not exist',
      );
    }

    if (data.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: Number(data.categoryId) },
      });
      if (!category) {
        throw new BadRequestException(
          'Selected category does not exist',
        );
      }
    }

    if (!data.audienceIds?.length) {
      throw new BadRequestException(
        'At least one audience is required',
      );
    }

    const audienceCount =
      await this.prisma.questionnaireAudience.count({
        where: {
          id: { in: data.audienceIds.map(Number) },
          isActive: true,
        },
      });

    if (audienceCount !== new Set(data.audienceIds).size) {
      throw new BadRequestException(
        'One or more selected audiences are invalid',
      );
    }

    if (data.applyToAllProducts === false) {
      if (!data.productIds?.length) {
        throw new BadRequestException(
          'Select at least one model for a model-specific question',
        );
      }

      const count = await this.prisma.product.count({
        where: {
          id: { in: data.productIds.map(Number) },
          ...(data.categoryId
            ? { categoryId: Number(data.categoryId) }
            : {}),
        },
      });

      if (count !== new Set(data.productIds).size) {
        throw new BadRequestException(
          'One or more selected products are invalid',
        );
      }
    }

    if (!data.options?.length) {
      throw new BadRequestException(
        'At least one answer is required',
      );
    }
  }

  private async syncCapabilities(
    tx: any,
    optionId: number,
    capabilityIds: number[] = [],
  ) {
    await tx.questionnaireOptionCapability.deleteMany({
      where: { optionId },
    });

    const unique = [...new Set(capabilityIds.map(Number))];
    if (!unique.length) return;

    const valid = await tx.deviceCapability.count({
      where: {
        id: { in: unique },
        isActive: true,
      },
    });

    if (valid !== unique.length) {
      throw new BadRequestException(
        'One or more capability filters are invalid',
      );
    }

    await tx.questionnaireOptionCapability.createMany({
      data: unique.map((capabilityId) => ({
        optionId,
        capabilityId,
      })),
      skipDuplicates: true,
    });
  }

  private async uniqueValue(
    tx: any,
    itemId: number,
    value: string,
    optionId?: number,
  ) {
    const normalized = this.normalize(value);
    const duplicate =
      await tx.questionnaireOption.findFirst({
        where: {
          itemId,
          value: normalized,
          ...(optionId ? { id: { not: optionId } } : {}),
        },
        select: { id: true },
      });

    if (!duplicate) return normalized;

    return optionId
      ? `${normalized}_${optionId}`
      : `${normalized}_${Date.now()}_${Math.floor(
          Math.random() * 1000,
        )}`;
  }

  private async syncOption(
    tx: any,
    itemId: number,
    option: BranchOptionInput,
    parentOptionId: number | null,
    displayOrder: number,
    seenIds: number[],
  ) {
    if (!option.label?.trim()) {
      throw new BadRequestException(
        'Answer/sub-option label is required',
      );
    }

    const deductionType =
      option.deductionType ?? 'PERCENTAGE';
    const deductionValue = this.number(
      option.deductionValue,
      0,
    );
    const deductionTrigger =
      option.deductionTrigger ?? 'SELECTED';

    this.validateDeduction(
      deductionType,
      deductionValue,
    );
    this.validateBranch(option);

    if (parentOptionId && option.showChildOptions) {
      throw new BadRequestException(
        'Only one sub-option level is supported',
      );
    }

    const value = await this.uniqueValue(
      tx,
      itemId,
      option.value || option.label,
      option.id,
    );

    const legacyPercent =
      deductionType === 'PERCENTAGE'
        ? deductionValue
        : 0;

    const data: any = {
      label: option.label.trim(),
      value,
      issueCode: option.issueCode
        ? this.normalize(option.issueCode)
        : null,
      deductionPercent: legacyPercent,
      deductionType,
      deductionValue,
      deductionTrigger,
      displayOrder:
        option.displayOrder ?? displayOrder,
      isActive: option.isActive ?? true,
      parentOptionId,
      showChildOptions:
        parentOptionId === null
          ? option.showChildOptions ?? false
          : false,
      childPrompt:
        parentOptionId === null
          ? option.childPrompt?.trim() || null
          : null,
      requireChildSelection:
        parentOptionId === null
          ? option.requireChildSelection ?? false
          : false,
      minChildSelections:
        parentOptionId === null
          ? this.number(option.minChildSelections, 0)
          : 0,
      maxChildSelections:
        parentOptionId === null
          ? option.maxChildSelections ?? null
          : null,
      childSelectionMode:
        parentOptionId === null
          ? option.childSelectionMode ?? 'MULTI'
          : 'MULTI',
    };

    let saved: any;

    if (option.id) {
      const current =
        await tx.questionnaireOption.findFirst({
          where: {
            id: Number(option.id),
            itemId,
          },
        });

      if (!current) {
        throw new BadRequestException(
          `Option ${option.id} does not belong to this question`,
        );
      }

      saved = await tx.questionnaireOption.update({
        where: { id: Number(option.id) },
        data,
      });
    } else {
      saved = await tx.questionnaireOption.create({
        data: {
          ...data,
          itemId,
        },
      });
    }

    seenIds.push(saved.id);

    await this.syncCapabilities(
      tx,
      saved.id,
      option.capabilityIds ?? [],
    );

    const children =
      parentOptionId === null &&
      data.showChildOptions
        ? option.childOptions ?? []
        : [];

    for (let i = 0; i < children.length; i++) {
      await this.syncOption(
        tx,
        itemId,
        children[i],
        saved.id,
        i + 1,
        seenIds,
      );
    }

    return saved;
  }

  async getBuilderQuestions() {
    return this.prisma.questionnaireItem.findMany({
      include: {
        section: true,
        category: true,
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
        options: {
          where: {
            parentOptionId: null,
          },
          orderBy: {
            displayOrder: 'asc',
          },
          include: {
            capabilities: {
              include: {
                capability: true,
              },
            },
            childOptions: {
              orderBy: {
                displayOrder: 'asc',
              },
              include: {
                capabilities: {
                  include: {
                    capability: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [
        { section: { displayOrder: 'asc' } },
        { displayOrder: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  async getBuilderQuestion(id: number) {
    const all = await this.getBuilderQuestions();
    const question = all.find((x: any) => x.id === id);

    if (!question) {
      throw new NotFoundException(
        'Question does not exist',
      );
    }

    return question;
  }

  async createQuestion(data: QuestionInput) {
    await this.validateMasterData(data);

    const code = this.normalize(
      data.code ||
        `${data.name}_${Date.now()}`,
    );

    const duplicate =
      await this.prisma.questionnaireItem.findUnique({
        where: { code },
      });

    if (duplicate) {
      throw new BadRequestException(
        'Question code already exists',
      );
    }

    const created = await this.prisma.$transaction(
      async (tx: any) => {
        const item =
          await tx.questionnaireItem.create({
            data: {
              code,
              name: data.name.trim(),
              questionText:
                data.questionText.trim(),
              answerType: data.answerType,
              sectionId: Number(data.sectionId),
              categoryId:
                data.categoryId
                  ? Number(data.categoryId)
                  : null,
              displayOrder:
                this.number(data.displayOrder, 0),
              isRequired:
                data.isRequired ?? true,
              isActive:
                data.isActive ?? true,
              applyToAllProducts:
                data.applyToAllProducts ?? true,
            },
          });

        await tx.questionnaireItemAudience.createMany({
          data: [...new Set(data.audienceIds)].map(
            (audienceId) => ({
              itemId: item.id,
              audienceId: Number(audienceId),
            }),
          ),
          skipDuplicates: true,
        });

        if (
          data.applyToAllProducts === false &&
          data.productIds?.length
        ) {
          await tx.questionnaireItemProduct.createMany({
            data: [...new Set(data.productIds)].map(
              (productId) => ({
                itemId: item.id,
                productId: Number(productId),
              }),
            ),
            skipDuplicates: true,
          });
        }

        const seen: number[] = [];

        for (let i = 0; i < data.options.length; i++) {
          await this.syncOption(
            tx,
            item.id,
            data.options[i],
            null,
            i + 1,
            seen,
          );
        }

        return item;
      },
    );

    return this.getBuilderQuestion(created.id);
  }

  async updateQuestion(
    id: number,
    data: QuestionInput,
  ) {
    await this.getBuilderQuestion(id);
    await this.validateMasterData(data);

    await this.prisma.$transaction(
      async (tx: any) => {
        await tx.questionnaireItem.update({
          where: { id },
          data: {
            name: data.name.trim(),
            questionText:
              data.questionText.trim(),
            answerType: data.answerType,
            sectionId: Number(data.sectionId),
            categoryId:
              data.categoryId
                ? Number(data.categoryId)
                : null,
            displayOrder:
              this.number(data.displayOrder, 0),
            isRequired:
              data.isRequired ?? true,
            isActive:
              data.isActive ?? true,
            applyToAllProducts:
              data.applyToAllProducts ?? true,
          },
        });

        await tx.questionnaireItemAudience.deleteMany({
          where: { itemId: id },
        });

        await tx.questionnaireItemAudience.createMany({
          data: [...new Set(data.audienceIds)].map(
            (audienceId) => ({
              itemId: id,
              audienceId: Number(audienceId),
            }),
          ),
          skipDuplicates: true,
        });

        await tx.questionnaireItemProduct.deleteMany({
          where: { itemId: id },
        });

        if (
          data.applyToAllProducts === false &&
          data.productIds?.length
        ) {
          await tx.questionnaireItemProduct.createMany({
            data: [...new Set(data.productIds)].map(
              (productId) => ({
                itemId: id,
                productId: Number(productId),
              }),
            ),
            skipDuplicates: true,
          });
        }

        const seenIds: number[] = [];

        for (let i = 0; i < data.options.length; i++) {
          await this.syncOption(
            tx,
            id,
            data.options[i],
            null,
            i + 1,
            seenIds,
          );
        }

        // Keep old rows for audit/rule stability but hide removed options.
        await tx.questionnaireOption.updateMany({
          where: {
            itemId: id,
            ...(seenIds.length
              ? { id: { notIn: seenIds } }
              : {}),
          },
          data: { isActive: false },
        });
      },
    );

    return this.getBuilderQuestion(id);
  }

  async setStatus(id: number, isActive: boolean) {
    await this.getBuilderQuestion(id);

    return this.prisma.questionnaireItem.update({
      where: { id },
      data: { isActive },
    });
  }

  private capabilityAllowed(
    option: any,
    productCapabilityIds: Set<number>,
  ) {
    const required = (
      option.capabilities ?? []
    ).map(
      (x: any) =>
        x.capabilityId ??
        x.capability?.id,
    );

    if (!required.length) return true;

    return required.some((id: number) =>
      productCapabilityIds.has(id),
    );
  }

  async getEffectiveQuestionnaire(
    productId: number,
    audienceCode = 'CUSTOMER',
  ) {
    const product =
      await this.prisma.product.findUnique({
        where: { id: Number(productId) },
        include: {
          category: true,
          brand: true,
          series: true,
          capabilities: {
            include: {
              capability: true,
            },
          },
        },
      });

    if (!product || !product.isActive) {
      throw new NotFoundException(
        'Product does not exist or is inactive',
      );
    }

    const audience =
      await this.prisma.questionnaireAudience.findUnique({
        where: {
          code: audienceCode
            .trim()
            .toUpperCase(),
        },
      });

    if (!audience || !audience.isActive) {
      throw new BadRequestException(
        'Invalid questionnaire audience',
      );
    }

    const questions =
      await this.prisma.questionnaireItem.findMany({
        where: {
          isActive: true,
          section: { isActive: true },
          OR: [
            { categoryId: null },
            { categoryId: product.categoryId },
          ],
          audiences: {
            some: {
              audienceId: audience.id,
            },
          },
          AND: [
            {
              OR: [
                { applyToAllProducts: true },
                {
                  productMappings: {
                    some: {
                      productId: product.id,
                    },
                  },
                },
              ],
            },
          ],
        },
        include: {
          section: true,
          options: {
            where: {
              isActive: true,
              parentOptionId: null,
            },
            orderBy: {
              displayOrder: 'asc',
            },
            include: {
              capabilities: {
                include: {
                  capability: true,
                },
              },
              childOptions: {
                where: {
                  isActive: true,
                },
                orderBy: {
                  displayOrder: 'asc',
                },
                include: {
                  capabilities: {
                    include: {
                      capability: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [
          { section: { displayOrder: 'asc' } },
          { displayOrder: 'asc' },
          { id: 'asc' },
        ],
      });

    const productCapabilityIds = new Set<number>(
      product.capabilities.map(
        (x: any) => x.capabilityId,
      ),
    );

    return {
      product: {
        id: product.id,
        name: product.name,
        category: product.category,
        brand: product.brand,
        series: product.series,
      },
      audience: audience.code,
      questions: questions.map((question: any) => ({
        id: question.id,
        code: question.code,
        name: question.name,
        questionText: question.questionText,
        answerType: question.answerType,
        isRequired: question.isRequired,
        displayOrder: question.displayOrder,
        section: question.section,
        options: question.options
          .filter((option: any) =>
            this.capabilityAllowed(
              option,
              productCapabilityIds,
            ),
          )
          .map((option: any) => ({
            id: option.id,
            label: option.label,
            value: option.value,
            issueCode: option.issueCode,
            showChildOptions:
              option.showChildOptions,
            childPrompt: option.childPrompt,
            requireChildSelection:
              option.requireChildSelection,
            minChildSelections:
              option.minChildSelections,
            maxChildSelections:
              option.maxChildSelections,
            childSelectionMode:
              option.childSelectionMode,
            childOptions:
              option.showChildOptions
                ? option.childOptions
                    .filter((child: any) =>
                      this.capabilityAllowed(
                        child,
                        productCapabilityIds,
                      ),
                    )
                    .map((child: any) => ({
                      id: child.id,
                      label: child.label,
                      value: child.value,
                      issueCode: child.issueCode,
                    }))
                : [],
          })),
      })),
    };
  }
}
