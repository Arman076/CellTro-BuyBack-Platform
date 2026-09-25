import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AgentInspectionStatus,
  SellOrderStatus,
} from '../generated/prisma/client.js';

import { PrismaService } from '../prisma/prisma/prisma.service.js';

type AgentIdentity = {
  agentId: number;
  vendorId: number;
};

type SubmittedAnswer = {
  questionId: number;
  optionIds: number[];
};

type SaveAnswersInput = {
  answers: SubmittedAnswer[];
};

type StoredAnswer = {
  questionId: number;
  optionIds: number[];
};

@Injectable()
export class AgentInspectionService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getInspection(
    identity: AgentIdentity,
    rawOrderNumber: string,
  ) {
    const order =
      await this.getOwnedInspectionOrder(
        identity,
        rawOrderNumber,
      );

    if (!order.inspection) {
      throw new ConflictException(
        'Inspection has not been started.',
      );
    }

    const questionnaire =
      await this.getQuestionnaire(
        order.productId,
      );

    const answers =
      this.parseStoredAnswers(
        order.inspection.answers,
      );

    return {
      orderNumber:
        order.orderNumber,

      status:
        order.status,

      product: {
        id:
          order.productId,

        variantId:
          order.variantId,

        name:
          order.productName,

        variant:
          order.variantLabel,

        image:
          order.productImage,
      },

      inspection: {
        id:
          order.inspection.id,

        status:
          order.inspection.status,

        startedAt:
          order.inspection.startedAt,

        completedAt:
          order.inspection.completedAt,

        answers,
      },

      questionnaire,
    };
  }

  async saveAnswers(
    identity: AgentIdentity,
    rawOrderNumber: string,
    input: SaveAnswersInput,
  ) {
    const order =
      await this.getOwnedInspectionOrder(
        identity,
        rawOrderNumber,
      );

    if (!order.inspection) {
      throw new ConflictException(
        'Inspection has not been started.',
      );
    }

    if (
      order.inspection.status ===
      AgentInspectionStatus.COMPLETED
    ) {
      throw new ConflictException(
        'Completed inspection cannot be modified.',
      );
    }

    if (
      order.status !==
      SellOrderStatus.PICKUP_STARTED
    ) {
      throw new ConflictException(
        'Order is not available for inspection.',
      );
    }

    const submittedAnswers =
      this.normalizeSubmittedAnswers(
        input?.answers,
      );

    const questionnaire =
      await this.getQuestionnaire(
        order.productId,
      );

    this.validateSubmittedAnswers(
      submittedAnswers,
      questionnaire,
    );

    /*
     * This endpoint saves a complete authoritative
     * questionnaire draft snapshot.
     *
     * We intentionally replace the previous draft
     * instead of merging arbitrary client JSON.
     *
     * That keeps retries idempotent and prevents
     * stale hidden answers from surviving when
     * branching changes.
     */
    const updated =
      await this.prisma.agentOrderInspection.updateMany({
        where: {
          id:
            order.inspection.id,

          orderId:
            order.id,

          agentId:
            identity.agentId,

          vendorId:
            identity.vendorId,

          status:
            AgentInspectionStatus.IN_PROGRESS,
        },

        data: {
          answers:
            submittedAnswers,
        },
      });

    if (
      updated.count !== 1
    ) {
      throw new ConflictException(
        'Inspection changed while answers were being saved. Refresh and try again.',
      );
    }

    return {
      saved: true,

      orderNumber:
        order.orderNumber,

      inspectionId:
        order.inspection.id,

      answerCount:
        submittedAnswers.length,
    };
  }

  private async getOwnedInspectionOrder(
    identity: AgentIdentity,
    rawOrderNumber: string,
  ) {
    const orderNumber =
      String(
        rawOrderNumber || '',
      ).trim();

    if (!orderNumber) {
      throw new BadRequestException(
        'Order number is required.',
      );
    }

    const order =
      await this.prisma.sellOrder.findFirst({
        where: {
          orderNumber,

          currentVendorId:
            identity.vendorId,

          agentAssignments: {
            some: {
              agentId:
                identity.agentId,

              vendorId:
                identity.vendorId,

              unassignedAt:
                null,
            },
          },
        },

        select: {
          id: true,

          orderNumber: true,

          status: true,

          productId: true,

          variantId: true,

          productName: true,

          productImage: true,

          variantLabel: true,

          inspection: {
            select: {
              id: true,

              agentId: true,

              vendorId: true,

              status: true,

              answers: true,

              startedAt: true,

              completedAt: true,
            },
          },
        },
      });

    /*
     * Deliberately return 404 for ownership failures.
     *
     * This prevents an authenticated Agent A from
     * learning whether Vendor B / Agent B has a
     * particular order number.
     */
    if (!order) {
      throw new NotFoundException(
        'Order does not exist.',
      );
    }

    if (
      order.inspection &&
      (
        order.inspection.agentId !==
          identity.agentId ||
        order.inspection.vendorId !==
          identity.vendorId
      )
    ) {
      throw new NotFoundException(
        'Order does not exist.',
      );
    }

    return order;
  }

  private async getQuestionnaire(
    productId: number,
  ) {
    /*
     * Single query for the runtime questionnaire.
     *
     * No per-question / per-option queries.
     */
    const questions =
      await this.prisma.questionnaireItem.findMany({
        where: {
          isActive:
            true,

          section: {
            isActive:
              true,
          },

          audiences: {
            some: {
              audience: {
                code:
                  'AGENT',

                isActive:
                  true,
              },
            },
          },

          OR: [
            {
              applyToAllProducts:
                true,
            },
            {
              productMappings: {
                some: {
                  productId,
                },
              },
            },
          ],
        },

        orderBy: [
          {
            section: {
              displayOrder:
                'asc',
            },
          },
          {
            displayOrder:
              'asc',
          },
          {
            id:
              'asc',
          },
        ],

        select: {
          id: true,

          code: true,

          name: true,

          questionText: true,

          answerType: true,

          displayOrder: true,

          isRequired: true,

          section: {
            select: {
              id: true,

              code: true,

              name: true,

              displayOrder: true,

              calculationMode: true,
            },
          },

          conditions: {
            select: {
              dependsOnOptionId:
                true,
            },
          },

          options: {
            where: {
              isActive:
                true,

              /*
               * Root options only.
               * Child options are loaded through
               * childOptions below.
               */
              parentOptionId:
                null,
            },

            orderBy: [
              {
                displayOrder:
                  'asc',
              },
              {
                id:
                  'asc',
              },
            ],

            select: {
              id: true,

              label: true,

              value: true,

              issueCode: true,

              severity: true,

              showChildOptions:
                true,

              childPrompt:
                true,

              requireChildSelection:
                true,

              minChildSelections:
                true,

              maxChildSelections:
                true,

              childSelectionMode:
                true,

              capabilities: {
                select: {
                  capabilityId:
                    true,
                },
              },

              issueGroups: {
                where: {
                  isActive:
                    true,
                },

                orderBy: {
                  displayOrder:
                    'asc',
                },

                select: {
                  id: true,

                  name: true,

                  displayOrder: true,
                },
              },

              childOptions: {
                where: {
                  isActive:
                    true,
                },

                orderBy: [
                  {
                    displayOrder:
                      'asc',
                  },
                  {
                    id:
                      'asc',
                  },
                ],

                select: {
                  id: true,

                  label: true,

                  value: true,

                  issueCode: true,

                  severity: true,

                  issueGroupId:
                    true,

                  capabilities: {
                    select: {
                      capabilityId:
                        true,
                    },
                  },
                },
              },
            },
          },
        },
      });

    const capabilities =
      await this.prisma.productCapability.findMany({
        where: {
          productId,
        },

        select: {
          capabilityId:
            true,
        },
      });

    const productCapabilityIds =
      new Set(
        capabilities.map(
          (item) =>
            item.capabilityId,
        ),
      );

    /*
     * Capability filtering happens server-side.
     *
     * Example:
     * Face ID option will not be sent for a device
     * that does not have the corresponding
     * capability.
     */
    return questions
      .map((question) => {
        const options =
          question.options
            .filter((option) =>
              this.matchesCapabilities(
                option.capabilities.map(
                  (mapping) =>
                    mapping.capabilityId,
                ),
                productCapabilityIds,
              ),
            )
            .map((option) => ({
              id:
                option.id,

              label:
                option.label,

              value:
                option.value,

              issueCode:
                option.issueCode,

              severity:
                option.severity,

              showChildOptions:
                option.showChildOptions,

              childPrompt:
                option.childPrompt,

              requireChildSelection:
                option.requireChildSelection,

              minChildSelections:
                option.minChildSelections,

              maxChildSelections:
                option.maxChildSelections,

              childSelectionMode:
                option.childSelectionMode,

              issueGroups:
                option.issueGroups,

              childOptions:
                option.childOptions
                  .filter(
                    (child) =>
                      this.matchesCapabilities(
                        child.capabilities.map(
                          (mapping) =>
                            mapping.capabilityId,
                        ),
                        productCapabilityIds,
                      ),
                  )
                  .map(
                    (child) => ({
                      id:
                        child.id,

                      label:
                        child.label,

                      value:
                        child.value,

                      issueCode:
                        child.issueCode,

                      severity:
                        child.severity,

                      issueGroupId:
                        child.issueGroupId,
                    }),
                  ),
            }));

        return {
          id:
            question.id,

          code:
            question.code,

          name:
            question.name,

          questionText:
            question.questionText,

          answerType:
            question.answerType,

          displayOrder:
            question.displayOrder,

          isRequired:
            question.isRequired,

          section:
            question.section,

          dependsOnOptionIds:
            question.conditions.map(
              (condition) =>
                condition.dependsOnOptionId,
            ),

          options,
        };
      })
      .filter(
        (question) =>
          question.options.length >
          0,
      );
  }

  private matchesCapabilities(
    requiredCapabilityIds: number[],
    productCapabilityIds: Set<number>,
  ) {
    /*
     * No capability mapping means the option is
     * universally applicable.
     */
    if (
      requiredCapabilityIds.length ===
      0
    ) {
      return true;
    }

    return requiredCapabilityIds.every(
      (capabilityId) =>
        productCapabilityIds.has(
          capabilityId,
        ),
    );
  }

  private normalizeSubmittedAnswers(
    rawAnswers:
      | SubmittedAnswer[]
      | undefined,
  ): StoredAnswer[] {
    if (
      !Array.isArray(rawAnswers)
    ) {
      throw new BadRequestException(
        'Answers must be an array.',
      );
    }

    const seenQuestions =
      new Set<number>();

    return rawAnswers.map(
      (rawAnswer) => {
        const questionId =
          Number(
            rawAnswer?.questionId,
          );

        if (
          !Number.isInteger(
            questionId,
          ) ||
          questionId <= 0
        ) {
          throw new BadRequestException(
            'Invalid question id.',
          );
        }

        if (
          seenQuestions.has(
            questionId,
          )
        ) {
          throw new BadRequestException(
            'Duplicate questionnaire answer.',
          );
        }

        seenQuestions.add(
          questionId,
        );

        if (
          !Array.isArray(
            rawAnswer.optionIds,
          )
        ) {
          throw new BadRequestException(
            'Option ids must be an array.',
          );
        }

        const optionIds =
          [
            ...new Set(
              rawAnswer.optionIds.map(
                Number,
              ),
            ),
          ];

        if (
          optionIds.some(
            (optionId) =>
              !Number.isInteger(
                optionId,
              ) ||
              optionId <= 0,
          )
        ) {
          throw new BadRequestException(
            'Invalid questionnaire option.',
          );
        }

        return {
          questionId,
          optionIds,
        };
      },
    );
  }

  private validateSubmittedAnswers(
    answers: StoredAnswer[],
    questionnaire: Awaited<
      ReturnType<
        AgentInspectionService[
          'getQuestionnaire'
        ]
      >
    >,
  ) {
    const questionsById =
      new Map(
        questionnaire.map(
          (question) => [
            question.id,
            question,
          ],
        ),
      );

    const selectedOptionIds =
      new Set(
        answers.flatMap(
          (answer) =>
            answer.optionIds,
        ),
      );

    for (
      const answer of answers
    ) {
      const question =
        questionsById.get(
          answer.questionId,
        );

      if (!question) {
        throw new BadRequestException(
          `Question ${answer.questionId} is not available for this device.`,
        );
      }

      /*
       * Conditional questions cannot be answered
       * unless at least one configured parent
       * option is currently selected.
       */
      if (
        question.dependsOnOptionIds.length >
          0 &&
        !question.dependsOnOptionIds.some(
          (optionId) =>
            selectedOptionIds.has(
              optionId,
            ),
        )
      ) {
        throw new BadRequestException(
          `Question ${question.id} is not currently applicable.`,
        );
      }

      const rootOptions =
        question.options;

      const validOptionIds =
        new Set<number>();

      const childToParent =
        new Map<
          number,
          (typeof rootOptions)[number]
        >();

      for (
        const option of rootOptions
      ) {
        validOptionIds.add(
          option.id,
        );

        for (
          const child of
            option.childOptions
        ) {
          validOptionIds.add(
            child.id,
          );

          childToParent.set(
            child.id,
            option,
          );
        }
      }

      for (
        const optionId of
          answer.optionIds
      ) {
        if (
          !validOptionIds.has(
            optionId,
          )
        ) {
          throw new BadRequestException(
            `Option ${optionId} is not valid for question ${question.id}.`,
          );
        }
      }

      if (
        (
          question.answerType ===
            'YES_NO' ||
          question.answerType ===
            'SINGLE_SELECT'
        ) &&
        answer.optionIds.length >
          1
      ) {
        throw new BadRequestException(
          `Question ${question.id} allows only one answer.`,
        );
      }

      /*
       * A child option cannot be submitted unless
       * its parent root option is also selected.
       */
      for (
        const optionId of
          answer.optionIds
      ) {
        const parent =
          childToParent.get(
            optionId,
          );

        if (
          parent &&
          !answer.optionIds.includes(
            parent.id,
          )
        ) {
          throw new BadRequestException(
            `Select the parent option before selecting child option ${optionId}.`,
          );
        }
      }

      for (
        const rootOption of
          rootOptions
      ) {
        const rootSelected =
          answer.optionIds.includes(
            rootOption.id,
          );

        if (!rootSelected) {
          continue;
        }

        const selectedChildren =
          rootOption.childOptions.filter(
            (child) =>
              answer.optionIds.includes(
                child.id,
              ),
          );

        if (
          rootOption.requireChildSelection &&
          selectedChildren.length <
            Math.max(
              1,
              rootOption.minChildSelections,
            )
        ) {
          throw new BadRequestException(
            `Select the required issue details for "${rootOption.label}".`,
          );
        }

        if (
          rootOption.maxChildSelections !==
            null &&
          selectedChildren.length >
            rootOption.maxChildSelections
        ) {
          throw new BadRequestException(
            `Too many issue details selected for "${rootOption.label}".`,
          );
        }

        if (
          rootOption.childSelectionMode ===
            'SINGLE' &&
          selectedChildren.length >
            1
        ) {
          throw new BadRequestException(
            `Only one issue detail can be selected for "${rootOption.label}".`,
          );
        }
      }
    }
  }

  private parseStoredAnswers(
    value: unknown,
  ): StoredAnswer[] {
    if (
      !Array.isArray(value)
    ) {
      return [];
    }

    const answers:
      StoredAnswer[] = [];

    for (
      const item of value
    ) {
      if (
        typeof item !==
          'object' ||
        item === null
      ) {
        continue;
      }

      const record =
        item as Record<
          string,
          unknown
        >;

      const questionId =
        Number(
          record.questionId,
        );

      const rawOptionIds =
        record.optionIds;

      if (
        !Number.isInteger(
          questionId,
        ) ||
        questionId <= 0 ||
        !Array.isArray(
          rawOptionIds,
        )
      ) {
        continue;
      }

      const optionIds =
        rawOptionIds
          .map(Number)
          .filter(
            (optionId) =>
              Number.isInteger(
                optionId,
              ) &&
              optionId > 0,
          );

      answers.push({
        questionId,
        optionIds: [
          ...new Set(
            optionIds,
          ),
        ],
      });
    }

    return answers;
  }
}