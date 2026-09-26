import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { createHash } from 'crypto';

import {
  AgentInspectionStatus,
  OrderEventActorType,
  OrderEventType,
  SellOrderStatus,
} from '../generated/prisma/client.js';

import type { Prisma } from '../generated/prisma/client.js';

import { PrismaService } from '../prisma/prisma/prisma.service.js';
import { QuestionnaireQuoteService } from '../questionnaire/questionnaire-quote.service.js';

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
    private readonly questionnaireQuoteService: QuestionnaireQuoteService,
  ) {}

  async getInspection(identity: AgentIdentity, rawOrderNumber: string) {
    const order = await this.getOwnedInspectionOrder(identity, rawOrderNumber);

    if (!order.inspection) {
      throw new ConflictException('Inspection has not been started.');
    }

    const questionnaire = await this.getQuestionnaire(order.productId);

    const answers = this.parseStoredAnswers(order.inspection.answers);

    return {
      orderNumber: order.orderNumber,

      status: order.status,

      product: {
        id: order.productId,

        variantId: order.variantId,

        name: order.productName,

        variant: order.variantLabel,

        image: order.productImage,
      },

      inspection: {
        id: order.inspection.id,

        status: order.inspection.status,

        startedAt: order.inspection.startedAt,

        completedAt: order.inspection.completedAt,

        answers,

        quote: this.toQuoteResponse(order.inspection),
      },

      questionnaire,
    };
  }

  async saveAnswers(
    identity: AgentIdentity,
    rawOrderNumber: string,
    input: SaveAnswersInput,
  ) {
    const order = await this.getOwnedInspectionOrder(identity, rawOrderNumber);

    if (!order.inspection) {
      throw new ConflictException('Inspection has not been started.');
    }

    if (order.inspection.status === AgentInspectionStatus.COMPLETED) {
      throw new ConflictException('Completed inspection cannot be modified.');
    }

    if (order.status !== SellOrderStatus.PICKUP_STARTED) {
      throw new ConflictException('Order is not available for inspection.');
    }

    const submittedAnswers = this.normalizeSubmittedAnswers(input?.answers);

    const questionnaire = await this.getQuestionnaire(order.productId);

    this.validateSubmittedAnswers(submittedAnswers, questionnaire);

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
    const updated = await this.prisma.agentOrderInspection.updateMany({
      where: {
        id: order.inspection.id,

        orderId: order.id,

        agentId: identity.agentId,

        vendorId: identity.vendorId,

        status: AgentInspectionStatus.IN_PROGRESS,
      },

      data: {
        answers: submittedAnswers,
      },
    });

    if (updated.count !== 1) {
      throw new ConflictException(
        'Inspection changed while answers were being saved. Refresh and try again.',
      );
    }

    return {
      saved: true,

      orderNumber: order.orderNumber,

      inspectionId: order.inspection.id,

      answerCount: submittedAnswers.length,
    };
  }

  async completeInspection(
    identity: AgentIdentity,
    rawOrderNumber: string,
    input: SaveAnswersInput,
  ) {
    const order = await this.getOwnedInspectionOrder(identity, rawOrderNumber);

    if (!order.inspection) {
      throw new ConflictException('Inspection has not been started.');
    }

    /*
     * Idempotent retry path.
     *
     * Once a quote is frozen, it is never recalculated
     * from newer Admin configuration on a retry.
     */
    if (order.inspection.status === AgentInspectionStatus.COMPLETED) {
      const existingQuote = this.toQuoteResponse(order.inspection);

      if (!existingQuote) {
        throw new ConflictException(
          'Inspection is completed but its quote snapshot is unavailable.',
        );
      }

      return {
        completed: true,
        alreadyCompleted: true,
        orderNumber: order.orderNumber,
        status: order.status,
        inspectionId: order.inspection.id,
        quote: existingQuote,
      };
    }

    if (order.status !== SellOrderStatus.PICKUP_STARTED) {
      throw new ConflictException(
        'Order is not available for inspection completion.',
      );
    }

    const submittedAnswers = this.normalizeSubmittedAnswers(input?.answers);

    const questionnaire = await this.getQuestionnaire(order.productId);

    this.validateSubmittedAnswers(submittedAnswers, questionnaire);

    this.validateCompleteAnswers(submittedAnswers, questionnaire);

    /*
     * Convert the Agent UI representation
     * { questionId, optionIds: [root + children] }
     * into the shared pricing-engine representation.
     *
     * The browser never tells us which IDs are roots,
     * children, deductions, base price or final price.
     */
    const pricingAnswers = this.toPricingAnswers(
      submittedAnswers,
      questionnaire,
    );

    /*
     * Authoritative pricing is calculated from
     * ProductVariant.basePrice + current DB-configured
     * AGENT deduction rules.
     *
     * SellOrder.finalPrice is intentionally NOT used as
     * the pricing base, preventing customer + agent
     * double deduction.
     */
    const calculatedQuote =
      await this.questionnaireQuoteService.calculateAgentQuote({
        productId: order.productId,
        variantId: order.variantId,
        answers: pricingAnswers,
      });

    const canonicalAnswers = submittedAnswers
      .map((answer) => ({
        questionId: answer.questionId,
        optionIds: [...answer.optionIds].sort((a, b) => a - b),
      }))
      .sort((a, b) => a.questionId - b.questionId);

    const quoteHash = this.createQuoteHash({
      orderId: order.id,
      inspectionId: order.inspection.id,
      productId: order.productId,
      variantId: order.variantId,
      answers: canonicalAnswers,
      basePrice: calculatedQuote.basePrice,
      rawDeduction: calculatedQuote.rawDeduction,
      totalDeduction: calculatedQuote.totalDeduction,
      finalPrice: calculatedQuote.finalPrice,
    });

    const quoteGeneratedAt = new Date();

    const quoteSnapshot = {
      version: 1,
      audience: 'AGENT',
      productId: order.productId,
      variantId: order.variantId,
      answers: canonicalAnswers,
      basePrice: calculatedQuote.basePrice,
      rawDeduction: calculatedQuote.rawDeduction,
      totalDeduction: calculatedQuote.totalDeduction,
      deductionCapPercent: calculatedQuote.deductionCapPercent,
      minimumFinalQuoteType: calculatedQuote.minimumFinalQuoteType,
      minimumFinalQuoteValue: calculatedQuote.minimumFinalQuoteValue,
      minimumFinalQuote: calculatedQuote.minimumFinalQuote,
      finalPrice: calculatedQuote.finalPrice,
      hasSevereIssue: calculatedQuote.hasSevereIssue,
      agentRejectEligible: calculatedQuote.agentRejectEligible,
      lines: calculatedQuote.lines,
    };

    const result = await this.prisma.$transaction(async (tx) => {
      /*
       * The conditional write is the concurrency
       * gate. Only one request can transition this
       * inspection from IN_PROGRESS to COMPLETED.
       */
      const inspectionUpdate = await tx.agentOrderInspection.updateMany({
        where: {
          id: order.inspection!.id,
          orderId: order.id,
          agentId: identity.agentId,
          vendorId: identity.vendorId,
          status: AgentInspectionStatus.IN_PROGRESS,
        },
        data: {
          answers: canonicalAnswers,
          status: AgentInspectionStatus.COMPLETED,
          completedAt: quoteGeneratedAt,
          quoteBasePrice: calculatedQuote.basePrice,
          quoteRawDeduction: calculatedQuote.rawDeduction,
          quoteTotalDeduction: calculatedQuote.totalDeduction,
          quoteFinalPrice: calculatedQuote.finalPrice,
          quoteSnapshot: quoteSnapshot as Prisma.InputJsonValue,
          quoteHash,
          quoteGeneratedAt,
        },
      });

      if (inspectionUpdate.count === 0) {
        /*
         * Another concurrent request may have won.
         * Re-read the canonical frozen quote rather
         * than returning our locally calculated one.
         */
        const existing = await tx.agentOrderInspection.findFirst({
          where: {
            id: order.inspection!.id,
            orderId: order.id,
            agentId: identity.agentId,
            vendorId: identity.vendorId,
            status: AgentInspectionStatus.COMPLETED,
          },
          select: {
            id: true,
            status: true,
            quoteBasePrice: true,
            quoteRawDeduction: true,
            quoteTotalDeduction: true,
            quoteFinalPrice: true,
            quoteSnapshot: true,
            quoteHash: true,
            quoteGeneratedAt: true,
            completedAt: true,
          },
        });

        const existingQuote = existing ? this.toQuoteResponse(existing) : null;

        if (!existingQuote) {
          throw new ConflictException(
            'Inspection changed while it was being completed. Refresh and try again.',
          );
        }

        return {
          alreadyCompleted: true,
          quote: existingQuote,
        };
      }

      /*
       * Order state transition is also conditional.
       * This prevents a stale request from moving an
       * order that has already changed lifecycle.
       */
      const orderUpdate = await tx.sellOrder.updateMany({
        where: {
          id: order.id,
          status: SellOrderStatus.PICKUP_STARTED,
          currentVendorId: identity.vendorId,
          agentAssignments: {
            some: {
              agentId: identity.agentId,
              vendorId: identity.vendorId,
              unassignedAt: null,
            },
          },
        },
        data: {
          status: SellOrderStatus.INSPECTION_COMPLETED,
        },
      });

      if (orderUpdate.count !== 1) {
        throw new ConflictException(
          'Order changed while inspection was being completed. Refresh and try again.',
        );
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: SellOrderStatus.INSPECTION_COMPLETED,
          note: 'Agent inspection completed and authoritative quote generated.',
        },
      });

      /*
       * Deterministic unique idempotency keys mean
       * retries cannot create duplicate lifecycle
       * events.
       */
      await tx.orderEvent.createMany({
        data: [
          {
            orderId: order.id,
            eventType: OrderEventType.INSPECTION_COMPLETED,
            actorType: OrderEventActorType.AGENT,
            agentId: identity.agentId,
            idempotencyKey: `inspection-completed:${order.inspection!.id}`,
            metadata: {
              inspectionId: order.inspection!.id,
            },
          },
          {
            orderId: order.id,
            eventType: OrderEventType.QUOTE_GENERATED,
            actorType: OrderEventActorType.SYSTEM,
            agentId: identity.agentId,
            idempotencyKey: `quote-generated:${order.inspection!.id}`,
            metadata: {
              inspectionId: order.inspection!.id,
              quoteHash,
              basePrice: calculatedQuote.basePrice,
              totalDeduction: calculatedQuote.totalDeduction,
              finalPrice: calculatedQuote.finalPrice,
            },
          },
        ],
        skipDuplicates: true,
      });

      return {
        alreadyCompleted: false,
        quote: {
          basePrice: calculatedQuote.basePrice,
          rawDeduction: calculatedQuote.rawDeduction,
          totalDeduction: calculatedQuote.totalDeduction,
          finalPrice: calculatedQuote.finalPrice,
          deductionCapPercent: calculatedQuote.deductionCapPercent,
          minimumFinalQuoteType: calculatedQuote.minimumFinalQuoteType,
          minimumFinalQuoteValue: calculatedQuote.minimumFinalQuoteValue,
          minimumFinalQuote: calculatedQuote.minimumFinalQuote,
          hasSevereIssue: calculatedQuote.hasSevereIssue,
          agentRejectEligible: calculatedQuote.agentRejectEligible,
          quoteHash,
          quoteGeneratedAt,
        },
      };
    });

    return {
      completed: true,
      alreadyCompleted: result.alreadyCompleted,
      orderNumber: order.orderNumber,
      status: SellOrderStatus.INSPECTION_COMPLETED,
      inspectionId: order.inspection.id,
      quote: result.quote,
    };
  }

  private async getOwnedInspectionOrder(
    identity: AgentIdentity,
    rawOrderNumber: string,
  ) {
    const orderNumber = String(rawOrderNumber || '').trim();

    if (!orderNumber) {
      throw new BadRequestException('Order number is required.');
    }

    const order = await this.prisma.sellOrder.findFirst({
      where: {
        orderNumber,

        currentVendorId: identity.vendorId,

        agentAssignments: {
          some: {
            agentId: identity.agentId,

            vendorId: identity.vendorId,

            unassignedAt: null,
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

            quoteBasePrice: true,

            quoteRawDeduction: true,

            quoteTotalDeduction: true,

            quoteFinalPrice: true,

            quoteSnapshot: true,

            quoteHash: true,

            quoteGeneratedAt: true,
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
      throw new NotFoundException('Order does not exist.');
    }

    if (
      order.inspection &&
      (order.inspection.agentId !== identity.agentId ||
        order.inspection.vendorId !== identity.vendorId)
    ) {
      throw new NotFoundException('Order does not exist.');
    }

    return order;
  }

  private async getQuestionnaire(productId: number) {
    /*
     * Single query for the runtime questionnaire.
     *
     * No per-question / per-option queries.
     */
    const questions = await this.prisma.questionnaireItem.findMany({
      where: {
        isActive: true,

        section: {
          isActive: true,
        },

        audiences: {
          some: {
            audience: {
              code: 'AGENT',

              isActive: true,
            },
          },
        },

        OR: [
          {
            applyToAllProducts: true,
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
            displayOrder: 'asc',
          },
        },
        {
          displayOrder: 'asc',
        },
        {
          id: 'asc',
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
            dependsOnOptionId: true,
          },
        },

        options: {
          where: {
            isActive: true,

            /*
             * Root options only.
             * Child options are loaded through
             * childOptions below.
             */
            parentOptionId: null,
          },

          orderBy: [
            {
              displayOrder: 'asc',
            },
            {
              id: 'asc',
            },
          ],

          select: {
            id: true,

            label: true,

            value: true,

            issueCode: true,

            severity: true,

            showChildOptions: true,

            childPrompt: true,

            requireChildSelection: true,

            minChildSelections: true,

            maxChildSelections: true,

            childSelectionMode: true,

            capabilities: {
              select: {
                capabilityId: true,
              },
            },

            issueGroups: {
              where: {
                isActive: true,
              },

              orderBy: {
                displayOrder: 'asc',
              },

              select: {
                id: true,

                name: true,

                displayOrder: true,
              },
            },

            childOptions: {
              where: {
                isActive: true,
              },

              orderBy: [
                {
                  displayOrder: 'asc',
                },
                {
                  id: 'asc',
                },
              ],

              select: {
                id: true,

                label: true,

                value: true,

                issueCode: true,

                severity: true,

                issueGroupId: true,

                capabilities: {
                  select: {
                    capabilityId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const capabilities = await this.prisma.productCapability.findMany({
      where: {
        productId,
      },

      select: {
        capabilityId: true,
      },
    });

    const productCapabilityIds = new Set(
      capabilities.map((item) => item.capabilityId),
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
        const options = question.options
          .filter((option) =>
            this.matchesCapabilities(
              option.capabilities.map((mapping) => mapping.capabilityId),
              productCapabilityIds,
            ),
          )
          .map((option) => ({
            id: option.id,

            label: option.label,

            value: option.value,

            issueCode: option.issueCode,

            severity: option.severity,

            showChildOptions: option.showChildOptions,

            childPrompt: option.childPrompt,

            requireChildSelection: option.requireChildSelection,

            minChildSelections: option.minChildSelections,

            maxChildSelections: option.maxChildSelections,

            childSelectionMode: option.childSelectionMode,

            issueGroups: option.issueGroups,

            childOptions: option.childOptions
              .filter((child) =>
                this.matchesCapabilities(
                  child.capabilities.map((mapping) => mapping.capabilityId),
                  productCapabilityIds,
                ),
              )
              .map((child) => ({
                id: child.id,

                label: child.label,

                value: child.value,

                issueCode: child.issueCode,

                severity: child.severity,

                issueGroupId: child.issueGroupId,
              })),
          }));

        return {
          id: question.id,

          code: question.code,

          name: question.name,

          questionText: question.questionText,

          answerType: question.answerType,

          displayOrder: question.displayOrder,

          isRequired: question.isRequired,

          section: question.section,

          dependsOnOptionIds: question.conditions.map(
            (condition) => condition.dependsOnOptionId,
          ),

          options,
        };
      })
      .filter((question) => question.options.length > 0);
  }

  private matchesCapabilities(
    requiredCapabilityIds: number[],
    productCapabilityIds: Set<number>,
  ) {
    /*
     * No capability mapping means the option is
     * universally applicable.
     */
    if (requiredCapabilityIds.length === 0) {
      return true;
    }

    return requiredCapabilityIds.every((capabilityId) =>
      productCapabilityIds.has(capabilityId),
    );
  }

  private normalizeSubmittedAnswers(
    rawAnswers: SubmittedAnswer[] | undefined,
  ): StoredAnswer[] {
    if (!Array.isArray(rawAnswers)) {
      throw new BadRequestException('Answers must be an array.');
    }

    const seenQuestions = new Set<number>();

    return rawAnswers.map((rawAnswer) => {
      const questionId = Number(rawAnswer?.questionId);

      if (!Number.isInteger(questionId) || questionId <= 0) {
        throw new BadRequestException('Invalid question id.');
      }

      if (seenQuestions.has(questionId)) {
        throw new BadRequestException('Duplicate questionnaire answer.');
      }

      seenQuestions.add(questionId);

      if (!Array.isArray(rawAnswer.optionIds)) {
        throw new BadRequestException('Option ids must be an array.');
      }

      const optionIds = [...new Set(rawAnswer.optionIds.map(Number))];

      if (
        optionIds.some(
          (optionId) => !Number.isInteger(optionId) || optionId <= 0,
        )
      ) {
        throw new BadRequestException('Invalid questionnaire option.');
      }

      return {
        questionId,
        optionIds,
      };
    });
  }

  private validateSubmittedAnswers(
    answers: StoredAnswer[],
    questionnaire: Awaited<
      ReturnType<AgentInspectionService['getQuestionnaire']>
    >,
  ) {
    const questionsById = new Map(
      questionnaire.map((question) => [question.id, question]),
    );

    const selectedOptionIds = new Set(
      answers.flatMap((answer) => answer.optionIds),
    );

    for (const answer of answers) {
      const question = questionsById.get(answer.questionId);

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
        question.dependsOnOptionIds.length > 0 &&
        !question.dependsOnOptionIds.some((optionId) =>
          selectedOptionIds.has(optionId),
        )
      ) {
        throw new BadRequestException(
          `Question ${question.id} is not currently applicable.`,
        );
      }

      const rootOptions = question.options;

      const validOptionIds = new Set<number>();

      const childToParent = new Map<number, (typeof rootOptions)[number]>();

      for (const option of rootOptions) {
        validOptionIds.add(option.id);

        for (const child of option.childOptions) {
          validOptionIds.add(child.id);

          childToParent.set(child.id, option);
        }
      }

      for (const optionId of answer.optionIds) {
        if (!validOptionIds.has(optionId)) {
          throw new BadRequestException(
            `Option ${optionId} is not valid for question ${question.id}.`,
          );
        }
      }

      const rootOptionIds = new Set(
  rootOptions.map((option) => option.id),
);

const selectedRootOptionIds =
  answer.optionIds.filter((optionId) =>
    rootOptionIds.has(optionId),
  );

if (
  (
    question.answerType === 'YES_NO' ||
    question.answerType === 'SINGLE_SELECT'
  ) &&
  selectedRootOptionIds.length > 1
) {
  throw new BadRequestException(
    `Question ${question.id} allows only one answer.`,
  );
}

      /*
       * A child option cannot be submitted unless
       * its parent root option is also selected.
       */
      for (const optionId of answer.optionIds) {
        const parent = childToParent.get(optionId);

        if (parent && !answer.optionIds.includes(parent.id)) {
          throw new BadRequestException(
            `Select the parent option before selecting child option ${optionId}.`,
          );
        }
      }

      for (const rootOption of rootOptions) {
        const rootSelected = answer.optionIds.includes(rootOption.id);

        if (!rootSelected) {
          continue;
        }

        const selectedChildren = rootOption.childOptions.filter((child) =>
          answer.optionIds.includes(child.id),
        );

        if (
          rootOption.requireChildSelection &&
          selectedChildren.length < Math.max(1, rootOption.minChildSelections)
        ) {
          throw new BadRequestException(
            `Select the required issue details for "${rootOption.label}".`,
          );
        }

        if (
          rootOption.maxChildSelections !== null &&
          selectedChildren.length > rootOption.maxChildSelections
        ) {
          throw new BadRequestException(
            `Too many issue details selected for "${rootOption.label}".`,
          );
        }

        if (
          rootOption.childSelectionMode === 'SINGLE' &&
          selectedChildren.length > 1
        ) {
          throw new BadRequestException(
            `Only one issue detail can be selected for "${rootOption.label}".`,
          );
        }
      }
    }
  }

  private validateCompleteAnswers(
    answers: StoredAnswer[],
    questionnaire: Awaited<
      ReturnType<AgentInspectionService['getQuestionnaire']>
    >,
  ) {
    const answersByQuestion = new Map(
      answers.map((answer) => [answer.questionId, answer]),
    );

    const selectedOptionIds = new Set(
      answers.flatMap((answer) => answer.optionIds),
    );

    for (const question of questionnaire) {
      const visible =
        question.dependsOnOptionIds.length === 0 ||
        question.dependsOnOptionIds.some((optionId) =>
          selectedOptionIds.has(optionId),
        );

      if (!visible) {
        continue;
      }

      if (!question.isRequired) {
        continue;
      }

      const answer = answersByQuestion.get(question.id);

      if (!answer) {
        throw new BadRequestException(
          `Please answer required question ${question.id}.`,
        );
      }

      const rootOptionIds = new Set(
        question.options.map((option) => option.id),
      );

      const selectedRootCount = answer.optionIds.filter((optionId) =>
        rootOptionIds.has(optionId),
      ).length;

      if (selectedRootCount === 0) {
        throw new BadRequestException(
          `Please answer required question ${question.id}.`,
        );
      }
    }
  }

  private toPricingAnswers(
    answers: StoredAnswer[],
    questionnaire: Awaited<
      ReturnType<AgentInspectionService['getQuestionnaire']>
    >,
  ) {
    const questionsById = new Map(
      questionnaire.map((question) => [question.id, question]),
    );

    return answers.map((answer) => {
      const question = questionsById.get(answer.questionId);

      if (!question) {
        throw new BadRequestException(
          `Question ${answer.questionId} is not available for this device.`,
        );
      }

      const rootIds = new Set(question.options.map((option) => option.id));

      const childIds = new Set(
        question.options.flatMap((option) =>
          option.childOptions.map((child) => child.id),
        ),
      );

      const selectedRoots = answer.optionIds.filter((optionId) =>
        rootIds.has(optionId),
      );

      const selectedChildren = answer.optionIds.filter((optionId) =>
        childIds.has(optionId),
      );

      if (question.answerType === 'MULTI_SELECT') {
        return {
          itemId: question.id,
          optionIds: selectedRoots,
          childOptionIds: selectedChildren,
        };
      }

      return {
        itemId: question.id,
        optionId: selectedRoots[0],
        childOptionIds: selectedChildren,
      };
    });
  }

  private createQuoteHash(value: {
    orderId: string;
    inspectionId: string;
    productId: number;
    variantId: number;
    answers: StoredAnswer[];
    basePrice: number;
    rawDeduction: number;
    totalDeduction: number;
    finalPrice: number;
  }) {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex');
  }

  private toQuoteResponse(inspection: {
    quoteBasePrice: unknown;
    quoteRawDeduction: unknown;
    quoteTotalDeduction: unknown;
    quoteFinalPrice: unknown;
    quoteSnapshot: unknown;
    quoteHash: string | null;
    quoteGeneratedAt: Date | null;
  }) {
    if (
      inspection.quoteBasePrice === null ||
      inspection.quoteTotalDeduction === null ||
      inspection.quoteFinalPrice === null ||
      !inspection.quoteHash ||
      !inspection.quoteGeneratedAt
    ) {
      return null;
    }

    const snapshot =
      typeof inspection.quoteSnapshot === 'object' &&
      inspection.quoteSnapshot !== null &&
      !Array.isArray(inspection.quoteSnapshot)
        ? (inspection.quoteSnapshot as Record<string, unknown>)
        : {};

    return {
      basePrice: Number(inspection.quoteBasePrice),
      rawDeduction: Number(inspection.quoteRawDeduction ?? 0),
      totalDeduction: Number(inspection.quoteTotalDeduction),
      finalPrice: Number(inspection.quoteFinalPrice),
      deductionCapPercent: Number(snapshot.deductionCapPercent ?? 0),
      minimumFinalQuoteType: snapshot.minimumFinalQuoteType ?? null,
      minimumFinalQuoteValue: Number(snapshot.minimumFinalQuoteValue ?? 0),
      minimumFinalQuote: Number(snapshot.minimumFinalQuote ?? 0),
      hasSevereIssue: Boolean(snapshot.hasSevereIssue),
      agentRejectEligible: Boolean(snapshot.agentRejectEligible),
      quoteHash: inspection.quoteHash,
      quoteGeneratedAt: inspection.quoteGeneratedAt,
    };
  }

  private parseStoredAnswers(value: unknown): StoredAnswer[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const answers: StoredAnswer[] = [];

    for (const item of value) {
      if (typeof item !== 'object' || item === null) {
        continue;
      }

      const record = item as Record<string, unknown>;

      const questionId = Number(record.questionId);

      const rawOptionIds = record.optionIds;

      if (
        !Number.isInteger(questionId) ||
        questionId <= 0 ||
        !Array.isArray(rawOptionIds)
      ) {
        continue;
      }

      const optionIds = rawOptionIds
        .map(Number)
        .filter((optionId) => Number.isInteger(optionId) && optionId > 0);

      answers.push({
        questionId,
        optionIds: [...new Set(optionIds)],
      });
    }

    return answers;
  }
}
