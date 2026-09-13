import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomInt, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma/prisma.service.js';

type AnswerInput = {
  itemId: number;
  optionId: number;
  childOptionIds?: number[];
};

type SendOtpInput = {
  productId: number;
  variantId: number;
  phone: string;
  answers: AnswerInput[];
};

type AppliedLine = {
  optionId: number;
  itemId: number;
  sectionId: number;
  sectionName: string;
  calculationMode: 'MAX' | 'SUM' | 'SINGLE';
  issueCode: string | null;
  label: string;
  severity: 'NORMAL' | 'SEVERE';
  agentRejectAllowed: boolean;
  deduction: number;
};

type QuoteResult = {
  basePrice: number;
  rawDeduction: number;
  totalDeduction: number;
  deductionCapPercent: number;
  minimumFinalQuoteType: 'PERCENTAGE' | 'FIXED';
  minimumFinalQuoteValue: number;
  minimumFinalQuote: number;
  finalPrice: number;
  hasSevereIssue: boolean;
  agentRejectEligible: boolean;
  lines: AppliedLine[];
};

type OtpSession = {
  id: string;
  phone: string;
  otpHash: string;
  expiresAt: number;
  attempts: number;
  quote: QuoteResult;
};

@Injectable()
export class QuestionnaireQuoteService {
  private readonly sessions = new Map<string, OtpSession>();
  constructor(private readonly prisma: PrismaService) {}

  private toNumber(value: unknown) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private cleanPhone(value: string) {
    return String(value || '').replace(/\D/g, '');
  }

  private amount(type: 'PERCENTAGE' | 'FIXED', value: number, basePrice: number) {
    return type === 'FIXED'
      ? Math.max(0, value)
      : Math.max(0, (basePrice * value) / 100);
  }

  private optionApplicable(
    option: any,
    context: {
      categoryId: number;
      brandId: number;
      seriesId: number | null;
      productId: number;
      variantId: number;
    },
  ) {
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
    if (scope === 'VARIANT') return target === context.variantId;
    return false;
  }

  private capabilityAllowed(option: any, capabilityIds: Set<number>) {
    const required = (option.capabilities || []).map((x: any) => x.capabilityId);
    return !required.length || required.some((id: number) => capabilityIds.has(id));
  }

  private resolveRule(option: any, context: any) {
    const rules = (option.deductionRules || [])
      .filter((rule: any) => rule.isActive)
      .sort((a: any, b: any) => (b.priority - a.priority) || (b.id - a.id));

    const scopes: Array<[string, (r: any) => boolean]> = [
      ['VARIANT', (r) => r.variantId === context.variantId],
      ['PRODUCT', (r) => r.productId === context.productId],
      ['SERIES', (r) => context.seriesId !== null && r.seriesId === context.seriesId],
      ['BRAND', (r) => r.brandId === context.brandId],
      ['CATEGORY', (r) => r.categoryId === context.categoryId],
      ['GLOBAL', () => true],
    ];

    for (const [scope, match] of scopes) {
      const found = rules.find((r: any) => r.scope === scope && match(r));
      if (found) {
        return {
          deductionType: found.deductionType as 'PERCENTAGE' | 'FIXED',
          deductionValue: this.toNumber(found.deductionValue ?? found.deductionPercent),
        };
      }
    }

    return {
      deductionType: option.deductionType as 'PERCENTAGE' | 'FIXED',
      deductionValue: this.toNumber(option.deductionValue ?? option.deductionPercent),
    };
  }

  private aggregateSections(lines: AppliedLine[]) {
    const bySection = new Map<number, AppliedLine[]>();
    for (const line of lines) {
      const bucket = bySection.get(line.sectionId) || [];
      bucket.push(line);
      bySection.set(line.sectionId, bucket);
    }

    let total = 0;
    for (const sectionLines of bySection.values()) {
      const mode = sectionLines[0]?.calculationMode || 'SUM';
      if (mode === 'MAX' || mode === 'SINGLE') {
        total += Math.max(0, ...sectionLines.map((x) => x.deduction));
      } else {
        total += sectionLines.reduce((sum, x) => sum + x.deduction, 0);
      }
    }
    return total;
  }

  async calculateQuote(body: SendOtpInput): Promise<QuoteResult> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: Number(body.variantId) },
      include: {
        product: {
          include: { capabilities: true },
        },
      },
    });

    if (!variant || !variant.isActive || variant.productId !== Number(body.productId)) {
      throw new NotFoundException('Selected variant is invalid');
    }
    if (!variant.product || !variant.product.isActive) {
      throw new NotFoundException('Selected product is inactive');
    }

    const basePrice = this.toNumber(variant.basePrice);
    const context = {
      categoryId: variant.product.categoryId,
      brandId: variant.product.brandId,
      seriesId: variant.product.seriesId,
      productId: variant.productId,
      variantId: variant.id,
    };
    const productCapabilityIds = new Set<number>(
      variant.product.capabilities.map((x: any) => x.capabilityId),
    );

    const customerAudience = await this.prisma.questionnaireAudience.findUnique({
      where: { code: 'CUSTOMER' },
    });
    if (!customerAudience?.isActive) {
      throw new BadRequestException('Customer questionnaire audience is not configured');
    }

    // One questionnaire query; no per-answer / per-rule N+1 queries.
    const questions = await this.prisma.questionnaireItem.findMany({
      where: {
        isActive: true,
        section: { isActive: true },
        audiences: { some: { audienceId: customerAudience.id } },
        OR: [{ categoryId: null }, { categoryId: context.categoryId }],
        AND: [{
          OR: [
            { applyToAllProducts: true },
            { productMappings: { some: { productId: context.productId } } },
          ],
        }],
      },
      include: {
        section: true,
        options: {
          where: { isActive: true },
          include: {
            capabilities: true,
            deductionRules: { where: { isActive: true } },
          },
        },
      },
      orderBy: [
        { section: { displayOrder: 'asc' } },
        { displayOrder: 'asc' },
        { id: 'asc' },
      ],
    });

    // Safety net for legacy duplicate questions: specific-model version wins
    // over a global question with the same section + wording.
    const logicalQuestions = new Map<string, any>();
    for (const q of questions as any[]) {
      const normalized = String(q.questionText || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const key = `${q.sectionId}:${normalized}`;
      const previous = logicalQuestions.get(key);
      if (!previous || (previous.applyToAllProducts && !q.applyToAllProducts)) {
        logicalQuestions.set(key, q);
      }
    }
    const effectiveQuestions = [...logicalQuestions.values()];

    const questionById = new Map<number, any>();
    for (const q of effectiveQuestions) questionById.set(q.id, q);

    const answers = body.answers || [];
    const answerByItem = new Map<number, AnswerInput>();
    for (const answer of answers) {
      if (answerByItem.has(Number(answer.itemId))) {
        throw new BadRequestException('Duplicate answer submitted for one question');
      }
      answerByItem.set(Number(answer.itemId), answer);
    }

    const missingRequired = effectiveQuestions.some((q: any) => q.isRequired && !answerByItem.has(q.id));
    if (missingRequired) {
      throw new BadRequestException('Please answer all required questionnaire questions');
    }

    const candidates: AppliedLine[] = [];

    for (const answer of answers) {
      const question = questionById.get(Number(answer.itemId));
      if (!question) throw new BadRequestException('One questionnaire answer is invalid');

      const mainOptions = question.options.filter((o: any) => o.parentOptionId === null);
      const option = mainOptions.find((o: any) => o.id === Number(answer.optionId));
      if (!option) throw new BadRequestException('Selected answer does not belong to the question');
      if (!this.capabilityAllowed(option, productCapabilityIds) || !this.optionApplicable(option, context)) {
        throw new BadRequestException('Selected answer is not applicable to this product');
      }

      const children = question.options
        .filter((o: any) => o.parentOptionId === option.id)
        .filter((o: any) => this.capabilityAllowed(o, productCapabilityIds))
        .filter((o: any) => this.optionApplicable(o, context));

      const applicableChildIds = new Set(children.map((c: any) => c.id));
      const selectedChildIds = [...new Set((answer.childOptionIds || []).map(Number))];
      if (selectedChildIds.some((id) => !applicableChildIds.has(id))) {
        throw new BadRequestException('One selected sub-option is not applicable');
      }

      if (option.showChildOptions) {
        const min = option.requireChildSelection
          ? Math.max(1, option.minChildSelections || 1)
          : option.minChildSelections || 0;
        if (selectedChildIds.length < min) {
          throw new BadRequestException(`Minimum ${min} sub-option selection required`);
        }
        if (option.maxChildSelections && selectedChildIds.length > option.maxChildSelections) {
          throw new BadRequestException('Too many sub-options selected');
        }
        if (option.childSelectionMode === 'SINGLE' && selectedChildIds.length > 1) {
          throw new BadRequestException('Only one sub-option can be selected');
        }
      } else if (selectedChildIds.length) {
        throw new BadRequestException('Sub-options are not allowed for this answer');
      }

      const maybePush = (candidate: any, shouldDeduct: boolean) => {
        if (!shouldDeduct) return;
        const rule = this.resolveRule(candidate, context);
        const deduction = this.amount(rule.deductionType, rule.deductionValue, basePrice);
        if (deduction <= 0) return;
        candidates.push({
          optionId: candidate.id,
          itemId: question.id,
          sectionId: question.sectionId,
          sectionName: question.section.name,
          calculationMode: question.section.calculationMode,
          issueCode: candidate.issueCode || null,
          label: candidate.label,
          severity: candidate.severity || 'NORMAL',
          agentRejectAllowed: Boolean(candidate.agentRejectAllowed),
          deduction,
        });
      };

      maybePush(option, option.deductionTrigger === 'SELECTED');

      if (option.showChildOptions) {
        const selectedSet = new Set(selectedChildIds);
        for (const child of children) {
          const selected = selectedSet.has(child.id);
          const shouldDeduct = child.deductionTrigger === 'MISSING' ? !selected : selected;
          maybePush(child, shouldDeduct);
        }
      }
    }

    // Global double-deduction guard. Same issueCode is charged only once.
    // If duplicate representations have different values, keep the larger applicable deduction.
    const deduped = new Map<string, AppliedLine>();
    for (const line of candidates) {
      const key = line.issueCode ? `ISSUE:${line.issueCode}` : `OPTION:${line.optionId}`;
      const previous = deduped.get(key);
      if (!previous || line.deduction > previous.deduction) deduped.set(key, line);
    }
    const lines = [...deduped.values()];

    const rawDeduction = this.aggregateSections(lines);
    const hasSevereIssue = lines.some((x) => x.severity === 'SEVERE');

    const productPolicy = await this.prisma.questionnaireQuotePolicy.findUnique({
      where: { key: `PRODUCT:${context.productId}` },
    });
    const globalPolicy = await this.prisma.questionnaireQuotePolicy.findUnique({
      where: { key: 'GLOBAL' },
    });
    const policy = productPolicy?.isActive
      ? productPolicy
      : globalPolicy?.isActive
        ? globalPolicy
        : null;

    const legacyPercent = hasSevereIssue
      ? this.toNumber(policy?.severeMinQuotePercent ?? 2)
      : this.toNumber(policy?.normalMinQuotePercent ?? 10);
    const minimumFinalType = String(
      hasSevereIssue
        ? policy?.severeMinQuoteType || 'PERCENTAGE'
        : policy?.normalMinQuoteType || 'PERCENTAGE',
    ).toUpperCase();
    const configuredValue = hasSevereIssue
      ? policy?.severeMinQuoteValue
      : policy?.normalMinQuoteValue;
    const minimumFinalValue =
      configuredValue == null ? legacyPercent : this.toNumber(configuredValue);

    const minimumFinalQuote =
      minimumFinalType === 'FIXED'
        ? Math.min(basePrice, Math.max(0, minimumFinalValue))
        : (basePrice * Math.min(100, Math.max(0, minimumFinalValue))) / 100;

    const maxAllowedDeduction = Math.max(0, basePrice - minimumFinalQuote);
    const totalDeduction = Math.min(Math.max(0, rawDeduction), maxAllowedDeduction);
    const deductionCapPercent =
      basePrice > 0 ? (maxAllowedDeduction / basePrice) * 100 : 0;

    return {
      basePrice: Math.round(basePrice),
      rawDeduction: Math.round(rawDeduction),
      totalDeduction: Math.round(totalDeduction),
      deductionCapPercent: Number(deductionCapPercent.toFixed(2)),
      minimumFinalQuoteType: minimumFinalType as 'PERCENTAGE' | 'FIXED',
      minimumFinalQuoteValue: minimumFinalValue,
      minimumFinalQuote: Math.round(minimumFinalQuote),
      finalPrice: Math.max(0, Math.round(basePrice - totalDeduction)),
      hasSevereIssue,
      agentRejectEligible: lines.some((x) => x.agentRejectAllowed),
      lines: lines.map((x) => ({ ...x, deduction: Math.round(x.deduction) })),
    };
  }

  async sendOtp(body: SendOtpInput) {
    const phone = this.cleanPhone(body.phone);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      throw new BadRequestException('Enter a valid 10-digit Indian mobile number');
    }

    const quote = await this.calculateQuote(body);
    const otp = String(randomInt(100000, 1000000));
    const sessionId = randomUUID();

    this.sessions.set(sessionId, {
      id: sessionId,
      phone,
      otpHash: this.hash(otp),
      expiresAt: Date.now() + 5 * 60 * 1000,
      attempts: 0,
      quote,
    });

    return {
      sessionId,
      expiresInSeconds: 300,
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
    };
  }

  async verifyOtp(sessionId: string, otp: string) {
    const session = this.sessions.get(sessionId);
    if (!session) throw new UnauthorizedException('OTP session is invalid or expired');
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      throw new UnauthorizedException('OTP has expired');
    }
    if (session.attempts >= 5) {
      this.sessions.delete(sessionId);
      throw new UnauthorizedException('Too many invalid OTP attempts');
    }

    session.attempts += 1;
    if (this.hash(String(otp)) !== session.otpHash) {
      throw new UnauthorizedException('Invalid OTP');
    }

    const result = {
      verified: true,
      phone: session.phone,
      ...session.quote,
    };
    this.sessions.delete(sessionId);
    return result;
  }
}
