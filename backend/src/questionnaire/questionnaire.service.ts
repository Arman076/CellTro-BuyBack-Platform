import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

@Injectable()
export class QuestionnaireService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // AUDIENCES
  // =========================================================

  async getAudiences() {
    return this.prisma.questionnaireAudience.findMany({
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  async createAudience(data: {
    code: string;
    name: string;
    displayOrder?: number;
    isActive?: boolean;
  }) {
    const code = this.normalizeCode(data.code);

    const existing =
      await this.prisma.questionnaireAudience.findUnique({
        where: {
          code,
        },
      });

    if (existing) {
      throw new BadRequestException(
        'Audience code already exists',
      );
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

  // =========================================================
  // SECTIONS
  // =========================================================

  async getSections() {
    return this.prisma.questionnaireSection.findMany({
      orderBy: {
        displayOrder: 'asc',
      },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    });
  }

  async createSection(data: {
    code: string;
    name: string;
    displayOrder?: number;
    isActive?: boolean;
  }) {
    const code = this.normalizeCode(data.code);

    const existing =
      await this.prisma.questionnaireSection.findUnique({
        where: {
          code,
        },
      });

    if (existing) {
      throw new BadRequestException(
        'Section code already exists',
      );
    }

    return this.prisma.questionnaireSection.create({
      data: {
        code,
        name: data.name.trim(),
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      },
    });
  }

  // =========================================================
  // QUESTIONS
  // =========================================================

  async getQuestions(filters?: {
    categoryId?: number;
    sectionId?: number;
    audienceId?: number;
  }) {
    return this.prisma.questionnaireItem.findMany({
      where: {
        ...(filters?.categoryId
          ? {
              categoryId: filters.categoryId,
            }
          : {}),

        ...(filters?.sectionId
          ? {
              sectionId: filters.sectionId,
            }
          : {}),

        ...(filters?.audienceId
          ? {
              audiences: {
                some: {
                  audienceId: filters.audienceId,
                },
              },
            }
          : {}),
      },

      orderBy: [
        {
          section: {
            displayOrder: 'asc',
          },
        },
        {
          displayOrder: 'asc',
        },
      ],

      include: {
        section: true,
        category: true,

        options: {
          orderBy: {
            displayOrder: 'asc',
          },
        },

        audiences: {
          include: {
            audience: true,
          },
        },

        productMappings: {
          include: {
            product: {
              include: {
                brand: true,
                category: true,
              },
            },
          },
        },

        conditions: {
          include: {
            dependsOnOption: {
              include: {
                item: true,
              },
            },
          },
        },
      },
    });
  }

  async getQuestion(id: number) {
    const question =
      await this.prisma.questionnaireItem.findUnique({
        where: {
          id,
        },

        include: {
          section: true,
          category: true,

          options: {
            orderBy: {
              displayOrder: 'asc',
            },
          },

          audiences: {
            include: {
              audience: true,
            },
          },

          productMappings: {
            include: {
              product: {
                include: {
                  brand: true,
                  category: true,
                },
              },
            },
          },

          conditions: {
            include: {
              dependsOnOption: {
                include: {
                  item: true,
                },
              },
            },
          },
        },
      });

    if (!question) {
      throw new NotFoundException(
        'Question does not exist',
      );
    }

    return question;
  }

  async createQuestion(data: {
    code: string;
    name: string;
    questionText: string;

    answerType:
      | 'YES_NO'
      | 'SINGLE_SELECT'
      | 'MULTI_SELECT';

    sectionId: number;

    categoryId?: number | null;

    displayOrder?: number;
    isRequired?: boolean;
    isActive?: boolean;

    applyToAllProducts?: boolean;

    audienceIds: number[];

    productIds?: number[];

    options: {
      label: string;
      value: string;
      deductionPercent?: number;
      displayOrder?: number;
      isActive?: boolean;
    }[];
  }) {
    const code = this.normalizeCode(data.code);

    const duplicate =
      await this.prisma.questionnaireItem.findUnique({
        where: {
          code,
        },
      });

    if (duplicate) {
      throw new BadRequestException(
        'Question code already exists',
      );
    }

    await this.validateQuestionMasterData(data);

    return this.prisma.questionnaireItem.create({
      data: {
        code,

        name: data.name.trim(),
        questionText: data.questionText.trim(),

        answerType: data.answerType,

        sectionId: data.sectionId,

        categoryId:
          data.categoryId ?? null,

        displayOrder:
          data.displayOrder ?? 0,

        isRequired:
          data.isRequired ?? true,

        isActive:
          data.isActive ?? true,

        applyToAllProducts:
          data.applyToAllProducts ?? true,

        audiences: {
          create: data.audienceIds.map(
            (audienceId) => ({
              audienceId,
            }),
          ),
        },

        productMappings:
          data.applyToAllProducts === false
            ? {
                create: (
                  data.productIds ?? []
                ).map((productId) => ({
                  productId,
                })),
              }
            : undefined,

        options: {
          create: data.options.map(
            (option, index) => ({
              label: option.label.trim(),

              value:
                this.normalizeCode(
                  option.value,
                ),

              deductionPercent:
                option.deductionPercent ?? 0,

              displayOrder:
                option.displayOrder ??
                index + 1,

              isActive:
                option.isActive ?? true,
            }),
          ),
        },
      },

      include: {
        section: true,
        category: true,

        options: {
          orderBy: {
            displayOrder: 'asc',
          },
        },

        audiences: {
          include: {
            audience: true,
          },
        },

        productMappings: {
          include: {
            product: true,
          },
        },
      },
    });
  }

  async updateQuestion(
    id: number,
    data: {
      name?: string;
      questionText?: string;

      answerType?:
        | 'YES_NO'
        | 'SINGLE_SELECT'
        | 'MULTI_SELECT';

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
        where: {
          id,
        },
      });

    if (!existing) {
      throw new NotFoundException(
        'Question does not exist',
      );
    }

    if (data.sectionId) {
      const section =
        await this.prisma.questionnaireSection.findUnique({
          where: {
            id: data.sectionId,
          },
        });

      if (!section) {
        throw new BadRequestException(
          'Selected section does not exist',
        );
      }
    }

    if (data.categoryId) {
      const category =
        await this.prisma.category.findUnique({
          where: {
            id: data.categoryId,
          },
        });

      if (!category) {
        throw new BadRequestException(
          'Selected category does not exist',
        );
      }
    }

    if (data.audienceIds) {
      await this.validateAudiences(
        data.audienceIds,
      );
    }

    if (data.productIds) {
      await this.validateProducts(
        data.productIds,
        data.categoryId ??
          existing.categoryId ??
          undefined,
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        if (data.audienceIds) {
          await tx.questionnaireItemAudience.deleteMany({
            where: {
              itemId: id,
            },
          });

          await tx.questionnaireItemAudience.createMany({
            data: data.audienceIds.map(
              (audienceId) => ({
                itemId: id,
                audienceId,
              }),
            ),
          });
        }

        if (
          data.productIds ||
          data.applyToAllProducts === true
        ) {
          await tx.questionnaireItemProduct.deleteMany({
            where: {
              itemId: id,
            },
          });

          if (
            data.applyToAllProducts === false &&
            data.productIds?.length
          ) {
            await tx.questionnaireItemProduct.createMany({
              data: data.productIds.map(
                (productId) => ({
                  itemId: id,
                  productId,
                }),
              ),
            });
          }
        }

        return tx.questionnaireItem.update({
          where: {
            id,
          },

          data: {
            ...(data.name !== undefined
              ? {
                  name: data.name.trim(),
                }
              : {}),

            ...(data.questionText !== undefined
              ? {
                  questionText:
                    data.questionText.trim(),
                }
              : {}),

            ...(data.answerType !== undefined
              ? {
                  answerType:
                    data.answerType,
                }
              : {}),

            ...(data.sectionId !== undefined
              ? {
                  sectionId:
                    data.sectionId,
                }
              : {}),

            ...(data.categoryId !== undefined
              ? {
                  categoryId:
                    data.categoryId,
                }
              : {}),

            ...(data.displayOrder !== undefined
              ? {
                  displayOrder:
                    data.displayOrder,
                }
              : {}),

            ...(data.isRequired !== undefined
              ? {
                  isRequired:
                    data.isRequired,
                }
              : {}),

            ...(data.isActive !== undefined
              ? {
                  isActive:
                    data.isActive,
                }
              : {}),

            ...(data.applyToAllProducts !==
            undefined
              ? {
                  applyToAllProducts:
                    data.applyToAllProducts,
                }
              : {}),
          },

          include: {
            section: true,
            category: true,
            options: true,

            audiences: {
              include: {
                audience: true,
              },
            },

            productMappings: {
              include: {
                product: true,
              },
            },
          },
        });
      },
    );
  }

  async removeQuestion(id: number) {
    await this.getQuestion(id);

    await this.prisma.questionnaireItem.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      message: 'Question deleted successfully',
    };
  }

  // =========================================================
  // OPTIONS + DEDUCTION
  // =========================================================

  async addOption(
    questionId: number,
    data: {
      label: string;
      value: string;
      deductionPercent?: number;
      displayOrder?: number;
      isActive?: boolean;
    },
  ) {
    await this.getQuestion(questionId);

    const value =
      this.normalizeCode(data.value);

    const existing =
      await this.prisma.questionnaireOption.findFirst({
        where: {
          itemId: questionId,
          value,
        },
      });

    if (existing) {
      throw new BadRequestException(
        'Option already exists for this question',
      );
    }

    return this.prisma.questionnaireOption.create({
      data: {
        itemId: questionId,

        label: data.label.trim(),
        value,

        deductionPercent:
          data.deductionPercent ?? 0,

        displayOrder:
          data.displayOrder ?? 0,

        isActive:
          data.isActive ?? true,
      },
    });
  }

  async updateOption(
    optionId: number,
    data: {
      label?: string;
      deductionPercent?: number;
      displayOrder?: number;
      isActive?: boolean;
    },
  ) {
    const option =
      await this.prisma.questionnaireOption.findUnique({
        where: {
          id: optionId,
        },
      });

    if (!option) {
      throw new NotFoundException(
        'Question option does not exist',
      );
    }

    return this.prisma.questionnaireOption.update({
      where: {
        id: optionId,
      },

      data: {
        ...(data.label !== undefined
          ? {
              label: data.label.trim(),
            }
          : {}),

        ...(data.deductionPercent !== undefined
          ? {
              deductionPercent:
                data.deductionPercent,
            }
          : {}),

        ...(data.displayOrder !== undefined
          ? {
              displayOrder:
                data.displayOrder,
            }
          : {}),

        ...(data.isActive !== undefined
          ? {
              isActive:
                data.isActive,
            }
          : {}),
      },
    });
  }

  async removeOption(optionId: number) {
    const option =
      await this.prisma.questionnaireOption.findUnique({
        where: {
          id: optionId,
        },
      });

    if (!option) {
      throw new NotFoundException(
        'Question option does not exist',
      );
    }

    await this.prisma.questionnaireOption.delete({
      where: {
        id: optionId,
      },
    });

    return {
      success: true,
      message: 'Option deleted successfully',
    };
  }

  // =========================================================
  // CONDITIONAL QUESTIONS
  // =========================================================

  async addCondition(
    itemId: number,
    dependsOnOptionId: number,
  ) {
    await this.getQuestion(itemId);

    const option =
      await this.prisma.questionnaireOption.findUnique({
        where: {
          id: dependsOnOptionId,
        },
      });

    if (!option) {
      throw new BadRequestException(
        'Parent option does not exist',
      );
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
      throw new BadRequestException(
        'Condition already exists',
      );
    }

    return this.prisma.questionnaireCondition.create({
      data: {
        itemId,
        dependsOnOptionId,
      },
    });
  }

  async removeCondition(id: number) {
    const condition =
      await this.prisma.questionnaireCondition.findUnique({
        where: {
          id,
        },
      });

    if (!condition) {
      throw new NotFoundException(
        'Condition does not exist',
      );
    }

    await this.prisma.questionnaireCondition.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      message: 'Condition removed',
    };
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private normalizeCode(value: string) {
    return value
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private async validateQuestionMasterData(data: {
    sectionId: number;
    categoryId?: number | null;
    audienceIds: number[];
    productIds?: number[];
    applyToAllProducts?: boolean;
    options: {
      label: string;
      value: string;
      deductionPercent?: number;
    }[];
  }) {
    const section =
      await this.prisma.questionnaireSection.findUnique({
        where: {
          id: data.sectionId,
        },
      });

    if (!section) {
      throw new BadRequestException(
        'Selected questionnaire section does not exist',
      );
    }

    if (data.categoryId) {
      const category =
        await this.prisma.category.findUnique({
          where: {
            id: data.categoryId,
          },
        });

      if (!category) {
        throw new BadRequestException(
          'Selected category does not exist',
        );
      }
    }

    await this.validateAudiences(
      data.audienceIds,
    );

    if (!data.options?.length) {
      throw new BadRequestException(
        'At least one answer option is required',
      );
    }

    const normalizedOptions =
      data.options.map((option) =>
        this.normalizeCode(option.value),
      );

    if (
      new Set(normalizedOptions).size !==
      normalizedOptions.length
    ) {
      throw new BadRequestException(
        'Duplicate option values are not allowed',
      );
    }

    for (const option of data.options) {
      const deduction =
        Number(option.deductionPercent ?? 0);

      if (
        deduction < 0 ||
        deduction > 100
      ) {
        throw new BadRequestException(
          'Deduction percentage must be between 0 and 100',
        );
      }
    }

    if (
      data.applyToAllProducts === false
    ) {
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

  private async validateAudiences(
    audienceIds: number[],
  ) {
    if (!audienceIds?.length) {
      throw new BadRequestException(
        'At least one audience is required',
      );
    }

    if (
      new Set(audienceIds).size !==
      audienceIds.length
    ) {
      throw new BadRequestException(
        'Duplicate audience is not allowed',
      );
    }

    const count =
      await this.prisma.questionnaireAudience.count({
        where: {
          id: {
            in: audienceIds,
          },
          isActive: true,
        },
      });

    if (count !== audienceIds.length) {
      throw new BadRequestException(
        'One or more selected audiences are invalid',
      );
    }
  }

  private async validateProducts(
    productIds: number[],
    categoryId?: number,
  ) {
    if (
      new Set(productIds).size !==
      productIds.length
    ) {
      throw new BadRequestException(
        'Duplicate product mapping is not allowed',
      );
    }

    const products =
      await this.prisma.product.findMany({
        where: {
          id: {
            in: productIds,
          },
        },

        select: {
          id: true,
          categoryId: true,
        },
      });

    if (
      products.length !== productIds.length
    ) {
      throw new BadRequestException(
        'One or more selected products do not exist',
      );
    }

    if (categoryId) {
      const wrongCategory =
        products.some(
          (product) =>
            product.categoryId !== categoryId,
        );

      if (wrongCategory) {
        throw new BadRequestException(
          'Selected product does not belong to the selected category',
        );
      }
    }
  }
}