import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma/prisma.service.js';

type DeductionType = 'PERCENTAGE' | 'FIXED';
type DeductionTrigger = 'SELECTED' | 'MISSING';
type ChildSelectionMode = 'SINGLE' | 'MULTI';

type ChildOptionInput = {
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
  applicabilityScope?: 'GLOBAL' | 'CATEGORY' | 'BRAND' | 'SERIES' | 'PRODUCT' | 'VARIANT';
  applicabilityTargetId?: number | null;
  severity?: 'NORMAL' | 'SEVERE';
  agentRejectAllowed?: boolean;
};

type IssueGroupInput = {
  id?: number;
  name: string;
  displayOrder?: number;
  isActive?: boolean;
  childOptions?: ChildOptionInput[];
};

type BranchOptionInput = ChildOptionInput & {
  showChildOptions?: boolean;
  childPrompt?: string | null;
  requireChildSelection?: boolean;
  minChildSelections?: number;
  maxChildSelections?: number | null;
  childSelectionMode?: ChildSelectionMode;

  // Legacy/simple branch:
  childOptions?: ChildOptionInput[];

  // V4 grouped branch:
  issueGroups?: IssueGroupInput[];
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

  private normalizedText(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private number(value: unknown, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  private validateDeduction(type: DeductionType, value: number) {
    if (value < 0) {
      throw new BadRequestException('Deduction cannot be negative');
    }
    if (type === 'PERCENTAGE' && value > 100) {
      throw new BadRequestException('Percentage deduction cannot exceed 100');
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
      throw new BadRequestException('Minimum child selection cannot be negative');
    }
    if (max !== null && max < min) {
      throw new BadRequestException(
        'Maximum child selection cannot be lower than minimum',
      );
    }
  }

  private async validateMasterData(data: QuestionInput, editingId?: number) {
    const section = await this.prisma.questionnaireSection.findUnique({
      where: { id: Number(data.sectionId) },
    });
    if (!section) {
      throw new BadRequestException('Questionnaire section does not exist');
    }

    if (data.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: Number(data.categoryId) },
      });
      if (!category) throw new BadRequestException('Selected category does not exist');
    }

    if (!data.audienceIds?.length) {
      throw new BadRequestException('At least one audience is required');
    }

    const audienceIds = [...new Set(data.audienceIds.map(Number))];
    const audienceCount = await this.prisma.questionnaireAudience.count({
      where: { id: { in: audienceIds }, isActive: true },
    });
    if (audienceCount !== audienceIds.length) {
      throw new BadRequestException('One or more selected audiences are invalid');
    }

    if (data.applyToAllProducts === false) {
      if (!data.productIds?.length) {
        throw new BadRequestException(
          'Select at least one model for a model-specific question',
        );
      }
      const ids = [...new Set(data.productIds.map(Number))];
      const count = await this.prisma.product.count({
        where: {
          id: { in: ids },
          ...(data.categoryId ? { categoryId: Number(data.categoryId) } : {}),
        },
      });
      if (count !== ids.length) {
        throw new BadRequestException('One or more selected products are invalid');
      }
    }

    if (!data.options?.length) {
      throw new BadRequestException('At least one answer is required');
    }

    // Avoid duplicate question wording in the same section/scope.
    const candidates = await this.prisma.questionnaireItem.findMany({
      where: {
        sectionId: Number(data.sectionId),
        ...(data.categoryId ? { categoryId: Number(data.categoryId) } : {}),
        ...(editingId ? { id: { not: editingId } } : {}),
      },
      include: { productMappings: true },
    });

    const wanted = this.normalizedText(data.questionText);
    const wantedProducts = new Set((data.productIds || []).map(Number));

    const duplicate = candidates.find((q: any) => {
      if (this.normalizedText(q.questionText) !== wanted) return false;

      if (data.applyToAllProducts !== false && q.applyToAllProducts) return true;
      if (data.applyToAllProducts === false && !q.applyToAllProducts) {
        return q.productMappings.some((m: any) => wantedProducts.has(m.productId));
      }
      return false;
    });

    if (duplicate) {
      throw new BadRequestException(
        'A similar question is already configured for this section and scope',
      );
    }
  }

  private async syncCapabilities(
    tx: any,
    optionId: number,
    capabilityIds: number[] = [],
  ) {
    await tx.questionnaireOptionCapability.deleteMany({ where: { optionId } });

    const unique = [...new Set(capabilityIds.map(Number))];
    if (!unique.length) return;

    const valid = await tx.deviceCapability.count({
      where: { id: { in: unique }, isActive: true },
    });
    if (valid !== unique.length) {
      throw new BadRequestException('One or more capability filters are invalid');
    }

    await tx.questionnaireOptionCapability.createMany({
      data: unique.map((capabilityId) => ({ optionId, capabilityId })),
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
    const duplicate = await tx.questionnaireOption.findFirst({
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
      : `${normalized}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  private async saveChild(
    tx: any,
    itemId: number,
    parentOptionId: number,
    issueGroupId: number | null,
    child: ChildOptionInput,
    displayOrder: number,
    seenOptionIds: number[],
  ) {
    if (!child.label?.trim()) {
      throw new BadRequestException('Issue/sub-option label is required');
    }

    const deductionType = child.deductionType ?? 'PERCENTAGE';
    const deductionValue = this.number(child.deductionValue, 0);
    const deductionTrigger = child.deductionTrigger ?? 'SELECTED';
    this.validateDeduction(deductionType, deductionValue);

    const value = await this.uniqueValue(
      tx,
      itemId,
      child.value || child.label,
      child.id,
    );

    const data: any = {
      label: child.label.trim(),
      value,
      issueCode: child.issueCode ? this.normalize(child.issueCode) : null,
      deductionPercent: deductionType === 'PERCENTAGE' ? deductionValue : 0,
      deductionType,
      deductionValue,
      deductionTrigger,
      applicabilityScope: child.applicabilityScope ?? 'GLOBAL',
      applicabilityTargetId: child.applicabilityScope && child.applicabilityScope !== 'GLOBAL' ? Number(child.applicabilityTargetId) : null,
      severity: child.severity ?? 'NORMAL',
      agentRejectAllowed: child.agentRejectAllowed ?? false,
      displayOrder: child.displayOrder ?? displayOrder,
      isActive: child.isActive ?? true,
      parentOptionId,
      issueGroupId,
      showChildOptions: false,
      childPrompt: null,
      requireChildSelection: false,
      minChildSelections: 0,
      maxChildSelections: null,
      childSelectionMode: 'MULTI',
    };

    let saved: any;

    if (child.id) {
      const current = await tx.questionnaireOption.findFirst({
        where: { id: Number(child.id), itemId, parentOptionId },
      });
      if (!current) {
        throw new BadRequestException(`Issue ${child.id} does not belong to this branch`);
      }
      saved = await tx.questionnaireOption.update({
        where: { id: Number(child.id) },
        data,
      });
    } else {
      saved = await tx.questionnaireOption.create({
        data: { ...data, itemId },
      });
    }

    seenOptionIds.push(saved.id);
    await this.syncCapabilities(tx, saved.id, child.capabilityIds ?? []);
    return saved;
  }

  private async syncIssueGroups(
    tx: any,
    itemId: number,
    parentOptionId: number,
    groups: IssueGroupInput[],
    seenOptionIds: number[],
  ) {
    const seenGroupIds: number[] = [];

    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi];
      if (!group.name?.trim()) {
        throw new BadRequestException('Issue group heading is required');
      }

      let savedGroup: any;
      if (group.id) {
        const current = await tx.questionnaireIssueGroup.findFirst({
          where: { id: Number(group.id), parentOptionId },
        });
        if (!current) {
          throw new BadRequestException(`Issue group ${group.id} is invalid`);
        }
        savedGroup = await tx.questionnaireIssueGroup.update({
          where: { id: Number(group.id) },
          data: {
            name: group.name.trim(),
            displayOrder: group.displayOrder ?? gi + 1,
            isActive: group.isActive ?? true,
          },
        });
      } else {
        const sameName = await tx.questionnaireIssueGroup.findFirst({
          where: {
            parentOptionId,
            name: { equals: group.name.trim(), mode: 'insensitive' },
          },
        });

        if (sameName) {
          savedGroup = await tx.questionnaireIssueGroup.update({
            where: { id: sameName.id },
            data: {
              displayOrder: group.displayOrder ?? gi + 1,
              isActive: group.isActive ?? true,
            },
          });
        } else {
          savedGroup = await tx.questionnaireIssueGroup.create({
            data: {
              name: group.name.trim(),
              displayOrder: group.displayOrder ?? gi + 1,
              isActive: group.isActive ?? true,
              parentOptionId,
            },
          });
        }
      }

      seenGroupIds.push(savedGroup.id);

      const children = group.childOptions || [];
      for (let ci = 0; ci < children.length; ci++) {
        await this.saveChild(
          tx,
          itemId,
          parentOptionId,
          savedGroup.id,
          children[ci],
          ci + 1,
          seenOptionIds,
        );
      }
    }

    // Remove obsolete groups only after detaching their child issues.
    const obsolete = await tx.questionnaireIssueGroup.findMany({
      where: {
        parentOptionId,
        ...(seenGroupIds.length ? { id: { notIn: seenGroupIds } } : {}),
      },
      select: { id: true },
    });

    const obsoleteIds = obsolete.map((x: any) => x.id);
    if (obsoleteIds.length) {
      await tx.questionnaireOption.updateMany({
        where: { issueGroupId: { in: obsoleteIds } },
        data: { issueGroupId: null, isActive: false },
      });
      await tx.questionnaireIssueGroup.deleteMany({
        where: { id: { in: obsoleteIds } },
      });
    }
  }

  private async syncMainOption(
    tx: any,
    itemId: number,
    option: BranchOptionInput,
    displayOrder: number,
    seenOptionIds: number[],
  ) {
    if (!option.label?.trim()) {
      throw new BadRequestException('Main answer label is required');
    }

    const deductionType = option.deductionType ?? 'PERCENTAGE';
    const deductionValue = this.number(option.deductionValue, 0);
    const deductionTrigger = option.deductionTrigger ?? 'SELECTED';
    this.validateDeduction(deductionType, deductionValue);
    this.validateBranch(option);

    const value = await this.uniqueValue(
      tx,
      itemId,
      option.value || option.label,
      option.id,
    );

    const hasGroups = (option.issueGroups || []).length > 0;
    const hasFlatChildren = (option.childOptions || []).length > 0;
    const showChildOptions =
      option.showChildOptions ?? (hasGroups || hasFlatChildren);

    const data: any = {
      label: option.label.trim(),
      value,
      issueCode: option.issueCode ? this.normalize(option.issueCode) : null,
      deductionPercent: deductionType === 'PERCENTAGE' ? deductionValue : 0,
      deductionType,
      deductionValue,
      deductionTrigger,
      applicabilityScope: option.applicabilityScope ?? 'GLOBAL',
      applicabilityTargetId: option.applicabilityScope && option.applicabilityScope !== 'GLOBAL' ? Number(option.applicabilityTargetId) : null,
      severity: option.severity ?? 'NORMAL',
      agentRejectAllowed: option.agentRejectAllowed ?? false,
      displayOrder: option.displayOrder ?? displayOrder,
      isActive: option.isActive ?? true,
      parentOptionId: null,
      issueGroupId: null,
      showChildOptions,
      childPrompt: option.childPrompt?.trim() || null,
      requireChildSelection: option.requireChildSelection ?? false,
      minChildSelections: this.number(option.minChildSelections, 0),
      maxChildSelections: option.maxChildSelections ?? null,
      childSelectionMode: option.childSelectionMode ?? 'MULTI',
    };

    let saved: any;
    if (option.id) {
      const current = await tx.questionnaireOption.findFirst({
        where: { id: Number(option.id), itemId, parentOptionId: null },
      });
      if (!current) {
        throw new BadRequestException(`Main answer ${option.id} is invalid`);
      }
      saved = await tx.questionnaireOption.update({
        where: { id: Number(option.id) },
        data,
      });
    } else {
      saved = await tx.questionnaireOption.create({
        data: { ...data, itemId },
      });
    }

    seenOptionIds.push(saved.id);
    await this.syncCapabilities(tx, saved.id, option.capabilityIds ?? []);

    if (showChildOptions) {
      if (hasGroups) {
        await this.syncIssueGroups(
          tx,
          itemId,
          saved.id,
          option.issueGroups || [],
          seenOptionIds,
        );

        // Any old flat children should be hidden unless re-used inside a group.
        await tx.questionnaireOption.updateMany({
          where: {
            itemId,
            parentOptionId: saved.id,
            issueGroupId: null,
            ...(seenOptionIds.length ? { id: { notIn: seenOptionIds } } : {}),
          },
          data: { isActive: false },
        });
      } else {
        // Legacy/simple branch support.
        await tx.questionnaireIssueGroup.deleteMany({
          where: { parentOptionId: saved.id },
        });

        const children = option.childOptions || [];
        for (let i = 0; i < children.length; i++) {
          await this.saveChild(
            tx,
            itemId,
            saved.id,
            null,
            children[i],
            i + 1,
            seenOptionIds,
          );
        }
      }
    } else {
      await tx.questionnaireOption.updateMany({
        where: { itemId, parentOptionId: saved.id },
        data: { isActive: false },
      });
      await tx.questionnaireIssueGroup.deleteMany({
        where: { parentOptionId: saved.id },
      });
    }

    return saved;
  }

  private builderInclude() {
    return {
      section: true,
      category: true,
      audiences: { include: { audience: true } },
      productMappings: {
        include: {
          product: {
            include: { brand: true, category: true, series: true },
          },
        },
      },
      options: {
        where: { parentOptionId: null },
        orderBy: { displayOrder: 'asc' },
        include: {
          capabilities: { include: { capability: true } },
          issueGroups: {
            orderBy: { displayOrder: 'asc' },
            include: {
              childOptions: {
                orderBy: { displayOrder: 'asc' },
                include: {
                  capabilities: { include: { capability: true } },
                },
              },
            },
          },
          childOptions: {
            orderBy: { displayOrder: 'asc' },
            include: {
              capabilities: { include: { capability: true } },
            },
          },
        },
      },
    } as any;
  }

  async getBuilderQuestions() {
    return this.prisma.questionnaireItem.findMany({
      include: this.builderInclude(),
      orderBy: [
        { section: { displayOrder: 'asc' } },
        { displayOrder: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  async getBuilderQuestion(id: number) {
    const question = await this.prisma.questionnaireItem.findUnique({
      where: { id },
      include: this.builderInclude(),
    });

    if (!question) throw new NotFoundException('Question does not exist');
    return question;
  }

  async createQuestion(data: QuestionInput) {
    await this.validateMasterData(data);

    const code = this.normalize(data.code || `${data.name}_${Date.now()}`);
    const duplicate = await this.prisma.questionnaireItem.findUnique({
      where: { code },
    });
    if (duplicate) throw new BadRequestException('Question code already exists');

    const created = await this.prisma.$transaction(async (tx: any) => {
      const item = await tx.questionnaireItem.create({
        data: {
          code,
          name: data.name.trim(),
          questionText: data.questionText.trim(),
          answerType: data.answerType,
          sectionId: Number(data.sectionId),
          categoryId: data.categoryId ? Number(data.categoryId) : null,
          displayOrder: this.number(data.displayOrder, 0),
          isRequired: data.isRequired ?? true,
          isActive: data.isActive ?? true,
          applyToAllProducts: data.applyToAllProducts ?? true,
        },
      });

      await tx.questionnaireItemAudience.createMany({
        data: [...new Set(data.audienceIds.map(Number))].map((audienceId) => ({
          itemId: item.id,
          audienceId,
        })),
        skipDuplicates: true,
      });

      if (data.applyToAllProducts === false && data.productIds?.length) {
        await tx.questionnaireItemProduct.createMany({
          data: [...new Set(data.productIds.map(Number))].map((productId) => ({
            itemId: item.id,
            productId,
          })),
          skipDuplicates: true,
        });
      }

      const seenOptionIds: number[] = [];
      for (let i = 0; i < data.options.length; i++) {
        await this.syncMainOption(
          tx,
          item.id,
          data.options[i],
          i + 1,
          seenOptionIds,
        );
      }

      return item;
    });

    return this.getBuilderQuestion(created.id);
  }

  async updateQuestion(id: number, data: QuestionInput) {
    await this.getBuilderQuestion(id);
    await this.validateMasterData(data, id);

    await this.prisma.$transaction(async (tx: any) => {
      await tx.questionnaireItem.update({
        where: { id },
        data: {
          name: data.name.trim(),
          questionText: data.questionText.trim(),
          answerType: data.answerType,
          sectionId: Number(data.sectionId),
          categoryId: data.categoryId ? Number(data.categoryId) : null,
          displayOrder: this.number(data.displayOrder, 0),
          isRequired: data.isRequired ?? true,
          isActive: data.isActive ?? true,
          applyToAllProducts: data.applyToAllProducts ?? true,
        },
      });

      await tx.questionnaireItemAudience.deleteMany({ where: { itemId: id } });
      await tx.questionnaireItemAudience.createMany({
        data: [...new Set(data.audienceIds.map(Number))].map((audienceId) => ({
          itemId: id,
          audienceId,
        })),
        skipDuplicates: true,
      });

      await tx.questionnaireItemProduct.deleteMany({ where: { itemId: id } });
      if (data.applyToAllProducts === false && data.productIds?.length) {
        await tx.questionnaireItemProduct.createMany({
          data: [...new Set(data.productIds.map(Number))].map((productId) => ({
            itemId: id,
            productId,
          })),
          skipDuplicates: true,
        });
      }

      const seenOptionIds: number[] = [];
      for (let i = 0; i < data.options.length; i++) {
        await this.syncMainOption(
          tx,
          id,
          data.options[i],
          i + 1,
          seenOptionIds,
        );
      }

      await tx.questionnaireOption.updateMany({
        where: {
          itemId: id,
          ...(seenOptionIds.length ? { id: { notIn: seenOptionIds } } : {}),
        },
        data: { isActive: false },
      });
    });

    return this.getBuilderQuestion(id);
  }

  async setStatus(id: number, isActive: boolean) {
    await this.getBuilderQuestion(id);
    return this.prisma.questionnaireItem.update({
      where: { id },
      data: { isActive },
    });
  }

  async deleteQuestion(id: number) {
    await this.getBuilderQuestion(id);
    await this.prisma.questionnaireItem.delete({ where: { id } });
    return { deleted: true, id };
  }

  async createSection(body: any) {
    const name = String(body?.name || '').trim();
    if (!name) throw new BadRequestException('Section name is required');

    const code = this.normalize(body?.code || name);
    const existing = await this.prisma.questionnaireSection.findFirst({
      where: {
        OR: [
          { code },
          { name: { equals: name, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('Questionnaire section already exists');
    }

    return this.prisma.questionnaireSection.create({
      data: {
        code,
        name,
        displayOrder: this.number(body?.displayOrder, 0),
        isActive: body?.isActive ?? true,
        calculationMode: body?.calculationMode || 'SUM',
      },
    });
  }

  private optionApplicable(option: any, context: {
    categoryId: number;
    brandId: number;
    seriesId: number | null;
    productId: number;
    variantId?: number | null;
  }) {
    const scope = option.applicabilityScope || 'GLOBAL';
    const target = option.applicabilityTargetId == null
      ? null
      : Number(option.applicabilityTargetId);

    if (scope === 'GLOBAL') return true;
    if (target === null) return false;
    if (scope === 'CATEGORY') return target === context.categoryId;
    if (scope === 'BRAND') return target === context.brandId;
    if (scope === 'SERIES') return context.seriesId !== null && target === context.seriesId;
    if (scope === 'PRODUCT') return target === context.productId;
    if (scope === 'VARIANT') return context.variantId != null && target === context.variantId;
    return false;
  }

  async updateOptionPolicy(optionId: number, body: any) {
    const optionRecord = await this.prisma.questionnaireOption.findUnique({
      where: { id: Number(optionId) },
    });
    if (!optionRecord) throw new NotFoundException('Question option does not exist');
    const option: any = optionRecord;

    const scope = String(body?.applicabilityScope || option.applicabilityScope || 'GLOBAL').toUpperCase();
    const validScopes = ['GLOBAL', 'CATEGORY', 'BRAND', 'SERIES', 'PRODUCT', 'VARIANT'];
    if (!validScopes.includes(scope)) {
      throw new BadRequestException('Invalid applicability scope');
    }

    const targetId = scope === 'GLOBAL'
      ? null
      : Number(body?.applicabilityTargetId);
    if (scope !== 'GLOBAL' && (targetId === null || !Number.isInteger(targetId) || targetId <= 0)) {
      throw new BadRequestException('Applicability target is required');
    }

    const trigger = String(body?.deductionTrigger || option.deductionTrigger || 'SELECTED').toUpperCase();
    if (!['SELECTED', 'MISSING'].includes(trigger)) {
      throw new BadRequestException('Invalid deduction trigger');
    }

    const severity = String(body?.severity || option.severity || 'NORMAL').toUpperCase();
    if (!['NORMAL', 'SEVERE'].includes(severity)) {
      throw new BadRequestException('Invalid issue severity');
    }

    return this.prisma.questionnaireOption.update({
      where: { id: Number(optionId) },
      data: {
        applicabilityScope: scope as any,
        applicabilityTargetId: targetId,
        deductionTrigger: trigger as any,
        severity: severity as any,
        agentRejectAllowed: Boolean(body?.agentRejectAllowed),
        issueCode: body?.issueCode === undefined
          ? option.issueCode
          : (body.issueCode ? this.normalize(String(body.issueCode)) : null),
      },
    });
  }

  private capabilityAllowed(option: any, productCapabilityIds: Set<number>) {
    const required = (option.capabilities ?? []).map(
      (x: any) => x.capabilityId ?? x.capability?.id,
    );
    if (!required.length) return true;
    return required.some((id: number) => productCapabilityIds.has(id));
  }


  async getDeductionRules(optionId: number) {
    const option = await this.prisma.questionnaireOption.findUnique({
      where: { id: Number(optionId) },
      select: { id: true },
    });
    if (!option) throw new NotFoundException('Question option does not exist');

    return this.prisma.questionnaireDeductionRule.findMany({
      where: { optionId: Number(optionId) },
      orderBy: [{ priority: 'desc' }, { id: 'desc' }],
    });
  }

  async upsertScopedDeductionRule(body: any) {
    const optionId = Number(body?.optionId);
    const scope = String(body?.scope || 'PRODUCT').toUpperCase();
    const targetId = scope === 'GLOBAL' ? null : Number(body?.targetId);
    const deductionType = String(body?.deductionType || 'PERCENTAGE').toUpperCase();
    const deductionValue = Number(body?.deductionValue ?? 0);
    const priority = Number.isFinite(Number(body?.priority)) ? Number(body.priority) : 100;

    if (!Number.isInteger(optionId) || optionId <= 0) {
      throw new BadRequestException('Valid optionId is required');
    }
    if (!['GLOBAL','CATEGORY','BRAND','SERIES','PRODUCT','VARIANT'].includes(scope)) {
      throw new BadRequestException('Invalid rule scope');
    }
    if (scope !== 'GLOBAL' && (targetId === null || !Number.isInteger(targetId) || targetId <= 0)) {
      throw new BadRequestException('Valid targetId is required for selected scope');
    }
    if (!['PERCENTAGE','FIXED'].includes(deductionType)) {
      throw new BadRequestException('Invalid deduction type');
    }
    this.validateDeduction(deductionType as DeductionType, deductionValue);

    const option = await this.prisma.questionnaireOption.findUnique({ where: { id: optionId } });
    if (!option) throw new NotFoundException('Question option does not exist');

    const where: any = { optionId, scope: scope as any };
    const dataTarget: any = {
      categoryId: null, brandId: null, seriesId: null, productId: null, variantId: null,
    };
    if (scope === 'CATEGORY') dataTarget.categoryId = targetId;
    if (scope === 'BRAND') dataTarget.brandId = targetId;
    if (scope === 'SERIES') dataTarget.seriesId = targetId;
    if (scope === 'PRODUCT') dataTarget.productId = targetId;
    if (scope === 'VARIANT') dataTarget.variantId = targetId;
    Object.assign(where, dataTarget);

    const existing = await this.prisma.questionnaireDeductionRule.findFirst({ where });
    const data: any = {
      scope: scope as any,
      ...dataTarget,
      deductionType: deductionType as any,
      deductionValue,
      deductionPercent: deductionType === 'PERCENTAGE' ? deductionValue : null,
      priority,
      isActive: true,
    };

    return existing
      ? this.prisma.questionnaireDeductionRule.update({ where: { id: existing.id }, data })
      : this.prisma.questionnaireDeductionRule.create({ data: { optionId, ...data } });
  }

  async getQuotePolicy(productId?: number | null) {
    const global = await this.prisma.questionnaireQuotePolicy.findUnique({
      where: { key: 'GLOBAL' },
    });
    let product = null;
    if (productId) {
      product = await this.prisma.questionnaireQuotePolicy.findUnique({
        where: { key: `PRODUCT:${Number(productId)}` },
      });
    }
    const effective = product?.isActive ? product : global?.isActive ? global : null;
    return {
      global,
      product,
      effective: effective || {
        key: 'DEFAULT',
        scope: 'GLOBAL',
        productId: null,
        normalMinQuotePercent: 10,
        severeMinQuotePercent: 2,
        normalMinQuoteType: 'PERCENTAGE',
        normalMinQuoteValue: 10,
        severeMinQuoteType: 'PERCENTAGE',
        severeMinQuoteValue: 2,
        isActive: true,
      },
    };
  }

  async saveQuotePolicy(body: any) {
    const scope = String(body?.scope || 'GLOBAL').toUpperCase();
    const productId = scope === 'PRODUCT' ? Number(body?.productId) : null;

    if (!['GLOBAL', 'PRODUCT'].includes(scope)) {
      throw new BadRequestException('Quote policy scope must be GLOBAL or PRODUCT');
    }
    if (scope === 'PRODUCT' && (productId == null || !Number.isInteger(productId) || productId <= 0)) {
      throw new BadRequestException('Valid productId is required');
    }

    const normalType = String(body?.normalMinQuoteType || 'PERCENTAGE').toUpperCase();
    const severeType = String(body?.severeMinQuoteType || 'PERCENTAGE').toUpperCase();
    const normalValue = Number(
      body?.normalMinQuoteValue ?? body?.normalMinQuotePercent ?? 10,
    );
    const severeValue = Number(
      body?.severeMinQuoteValue ?? body?.severeMinQuotePercent ?? 2,
    );

    const validateFloor = (label: string, type: string, value: number) => {
      if (!['PERCENTAGE', 'FIXED'].includes(type)) {
        throw new BadRequestException(`${label} type must be PERCENTAGE or FIXED`);
      }
      if (!Number.isFinite(value) || value < 0) {
        throw new BadRequestException(`${label} value must be 0 or greater`);
      }
      if (type === 'PERCENTAGE' && value > 100) {
        throw new BadRequestException(`${label} percentage must be between 0 and 100`);
      }
    };

    validateFloor('Normal minimum quote', normalType, normalValue);
    validateFloor('Severe minimum quote', severeType, severeValue);

    if (scope === 'PRODUCT') {
      const product = await this.prisma.product.findUnique({ where: { id: productId! } });
      if (!product) throw new NotFoundException('Selected product does not exist');
    }

    const key = scope === 'GLOBAL' ? 'GLOBAL' : `PRODUCT:${productId}`;
    const data: any = {
      productId,
      normalMinQuoteType: normalType,
      normalMinQuoteValue: normalValue,
      severeMinQuoteType: severeType,
      severeMinQuoteValue: severeValue,
      isActive: body?.isActive !== false,
    };

    // Keep legacy percent columns synchronized whenever the new mode is percentage.
    if (normalType === 'PERCENTAGE') data.normalMinQuotePercent = normalValue;
    if (severeType === 'PERCENTAGE') data.severeMinQuotePercent = severeValue;

    return this.prisma.questionnaireQuotePolicy.upsert({
      where: { key },
      create: {
        key,
        scope: scope as any,
        normalMinQuotePercent: normalType === 'PERCENTAGE' ? normalValue : 10,
        severeMinQuotePercent: severeType === 'PERCENTAGE' ? severeValue : 2,
        ...data,
      },
      update: data,
    });
  }

  async getEffectiveQuestionnaire(productId: number, audienceCode = 'CUSTOMER', variantId?: number | null) {
    const product = await this.prisma.product.findUnique({
      where: { id: Number(productId) },
      include: {
        category: true,
        brand: true,
        series: true,
        capabilities: { include: { capability: true } },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException('Product does not exist or is inactive');
    }

    let effectiveVariantId: number | null = null;
    if (variantId != null) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: Number(variantId) },
        select: { id: true, productId: true, isActive: true },
      });
      if (!variant || !variant.isActive || variant.productId !== product.id) {
        throw new BadRequestException('Variant does not belong to selected product');
      }
      effectiveVariantId = variant.id;
    }

    const applicabilityContext = {
      categoryId: product.categoryId,
      brandId: product.brandId,
      seriesId: product.seriesId,
      productId: product.id,
      variantId: effectiveVariantId,
    };

    const audience = await this.prisma.questionnaireAudience.findUnique({
      where: { code: audienceCode.trim().toUpperCase() },
    });

    if (!audience || !audience.isActive) {
      throw new BadRequestException('Invalid questionnaire audience');
    }

    const questions = await this.prisma.questionnaireItem.findMany({
      where: {
        isActive: true,
        section: { isActive: true },
        OR: [{ categoryId: null }, { categoryId: product.categoryId }],
        audiences: { some: { audienceId: audience.id } },
        AND: [
          {
            OR: [
              { applyToAllProducts: true },
              { productMappings: { some: { productId: product.id } } },
            ],
          },
        ],
      },
      include: {
        section: true,
        productMappings: true,
        options: {
          where: { isActive: true, parentOptionId: null },
          orderBy: { displayOrder: 'asc' },
          include: {
            capabilities: { include: { capability: true } },
            issueGroups: {
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' },
              include: {
                childOptions: {
                  where: { isActive: true },
                  orderBy: { displayOrder: 'asc' },
                  include: {
                    capabilities: { include: { capability: true } },
                  },
                },
              },
            },
            childOptions: {
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' },
              include: {
                capabilities: { include: { capability: true } },
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
      product.capabilities.map((x: any) => x.capabilityId),
    );

    // Safety net for old data: if the same logical question exists globally and
    // specifically for this model, return only one. Product-specific wins.
    const questionMap = new Map<string, any>();
    for (const question of questions as any[]) {
      const key = `${question.sectionId}:${this.normalizedText(question.questionText)}`;
      const previous = questionMap.get(key);
      if (!previous) {
        questionMap.set(key, question);
        continue;
      }
      if (previous.applyToAllProducts && !question.applyToAllProducts) {
        questionMap.set(key, question);
      }
    }
    const effectiveQuestions = [...questionMap.values()].sort((a: any, b: any) =>
      (a.section.displayOrder - b.section.displayOrder) ||
      (a.displayOrder - b.displayOrder) ||
      (a.id - b.id),
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
      questions: effectiveQuestions.map((question: any) => ({
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
            this.capabilityAllowed(option, productCapabilityIds) &&
            this.optionApplicable(option, applicabilityContext),
          )
          .map((option: any) => {
            const groups = (option.issueGroups || [])
              .map((group: any) => ({
                id: group.id,
                name: group.name,
                displayOrder: group.displayOrder,
                childOptions: (group.childOptions || [])
                  .filter((child: any) =>
                    this.capabilityAllowed(child, productCapabilityIds) &&
                    this.optionApplicable(child, applicabilityContext),
                  )
                  .map((child: any) => ({
                    id: child.id,
                    label: child.label,
                    value: child.value,
                    issueCode: child.issueCode,
                    severity: child.severity,
                    agentRejectAllowed: child.agentRejectAllowed,
                  })),
              }))
              .filter((group: any) => group.childOptions.length > 0);

            const groupedChildIds = new Set(
              groups.flatMap((g: any) => g.childOptions.map((c: any) => c.id)),
            );

            const flatChildren = (option.childOptions || [])
              .filter((child: any) => !groupedChildIds.has(child.id))
              .filter((child: any) =>
                this.capabilityAllowed(child, productCapabilityIds) &&
                    this.optionApplicable(child, applicabilityContext),
              )
              .map((child: any) => ({
                id: child.id,
                label: child.label,
                value: child.value,
                issueCode: child.issueCode,
                severity: child.severity,
                agentRejectAllowed: child.agentRejectAllowed,
              }));

            return {
              id: option.id,
              label: option.label,
              value: option.value,
              issueCode: option.issueCode,
              severity: option.severity,
              agentRejectAllowed: option.agentRejectAllowed,
              showChildOptions: option.showChildOptions,
              childPrompt: option.childPrompt,
              requireChildSelection: option.requireChildSelection,
              minChildSelections: option.minChildSelections,
              maxChildSelections: option.maxChildSelections,
              childSelectionMode: option.childSelectionMode,
              issueGroups: groups,
              childOptions: flatChildren,
            };
          }),
      })),
    };
  }

  async getAggregationPolicies(productId?: number | null) {
    const effectiveProductId = productId == null ? null : Number(productId);
    if (
      effectiveProductId != null &&
      (!Number.isInteger(effectiveProductId) || effectiveProductId <= 0)
    ) {
      throw new BadRequestException('Invalid productId');
    }

    const policies = await this.prisma.questionnaireAggregationPolicy.findMany({
      where: effectiveProductId
        ? {
            level: 'SECTION',
            OR: [
              { scope: 'GLOBAL' },
              { scope: 'PRODUCT', productId: effectiveProductId },
            ],
          }
        : { level: 'SECTION', scope: 'GLOBAL' },
      orderBy: [
        { level: 'asc' },
        { targetId: 'asc' },
        { scope: 'asc' },
        { id: 'asc' },
      ],
    });

    return policies;
  }

  async saveAggregationPolicy(body: any) {
    const level = String(body?.level || '').trim().toUpperCase();
    const targetId = Number(body?.targetId);
    const scope = String(body?.scope || 'GLOBAL').trim().toUpperCase();
    const productId = scope === 'PRODUCT' ? Number(body?.productId) : null;
    const calculationMode = String(body?.calculationMode || '').trim().toUpperCase();
    const rawCapType = body?.capType == null || body?.capType === ''
      ? null
      : String(body.capType).trim().toUpperCase();
    const capValue = rawCapType ? Number(body?.capValue) : null;

    if (level !== 'SECTION') {
      throw new BadRequestException('Only SECTION-level aggregation policy is supported');
    }
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new BadRequestException('Valid targetId is required');
    }
    if (!['GLOBAL', 'PRODUCT'].includes(scope)) {
      throw new BadRequestException('scope must be GLOBAL or PRODUCT');
    }
    if (
      scope === 'PRODUCT' &&
      (productId == null || !Number.isInteger(productId) || productId <= 0)
    ) {
      throw new BadRequestException('Valid productId is required for PRODUCT scope');
    }
    if (!['MAX', 'SUM', 'SINGLE'].includes(calculationMode)) {
      throw new BadRequestException('calculationMode must be MAX, SUM or SINGLE');
    }
    if (rawCapType && !['PERCENTAGE', 'FIXED'].includes(rawCapType)) {
      throw new BadRequestException('capType must be PERCENTAGE, FIXED or empty');
    }
    if (rawCapType) {
      if (!Number.isFinite(capValue) || Number(capValue) < 0) {
        throw new BadRequestException('capValue must be 0 or greater');
      }
      if (rawCapType === 'PERCENTAGE' && Number(capValue) > 100) {
        throw new BadRequestException('Percentage cap must be between 0 and 100');
      }
    }

    const section = await this.prisma.questionnaireSection.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!section) throw new NotFoundException('Questionnaire section does not exist');

    if (scope === 'PRODUCT') {
      const product = await this.prisma.product.findUnique({
        where: { id: productId! },
        select: { id: true },
      });
      if (!product) throw new NotFoundException('Selected product does not exist');
    }

    const key = scope === 'GLOBAL'
      ? `${level}:${targetId}:GLOBAL`
      : `${level}:${targetId}:PRODUCT:${productId}`;

    const data: any = {
      level,
      targetId,
      scope: scope as any,
      productId,
      calculationMode: calculationMode as any,
      capType: rawCapType as any,
      capValue,
      isActive: body?.isActive !== false,
    };

    return this.prisma.questionnaireAggregationPolicy.upsert({
      where: { key },
      create: { key, ...data },
      update: data,
    });
  }

  async deleteAggregationPolicy(
    levelInput: string,
    targetIdInput: number,
    productIdInput?: number | null,
  ) {
    const level = String(levelInput || '').trim().toUpperCase();
    const targetId = Number(targetIdInput);
    const productId = productIdInput == null ? null : Number(productIdInput);

    if (level !== 'SECTION') {
      throw new BadRequestException('Only SECTION-level aggregation policy is supported');
    }
    if (!Number.isInteger(targetId) || targetId <= 0) {
      throw new BadRequestException('Valid targetId is required');
    }
    if (
      productId != null &&
      (!Number.isInteger(productId) || productId <= 0)
    ) {
      throw new BadRequestException('Invalid productId');
    }

    const key = productId
      ? `${level}:${targetId}:PRODUCT:${productId}`
      : `${level}:${targetId}:GLOBAL`;

    const existing = await this.prisma.questionnaireAggregationPolicy.findUnique({
      where: { key },
      select: { id: true },
    });
    if (!existing) return { success: true, deleted: false };

    await this.prisma.questionnaireAggregationPolicy.delete({ where: { key } });
    return { success: true, deleted: true };
  }

}
