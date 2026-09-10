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

type QuoteLine = {
  optionId: number;
  issueCode: string | null;
  label: string;
  deduction: number;
};

type QuoteResult = {
  basePrice: number;
  totalDeduction: number;
  finalPrice: number;
  lines: QuoteLine[];
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

  private calculateAmount(
    type: 'PERCENTAGE' | 'FIXED',
    value: number,
    basePrice: number,
  ) {
    return type === 'FIXED'
      ? Math.max(0, value)
      : Math.max(0, (basePrice * value) / 100);
  }

  private async resolveRule(option: any, context: any) {
    const rules = await this.prisma.questionnaireDeductionRule.findMany({
      where: { optionId: option.id, isActive: true },
      orderBy: [{ priority: 'desc' }, { id: 'desc' }],
    });

    const ordered = [
      ['VARIANT', (r: any) => r.variantId === context.variantId],
      ['PRODUCT', (r: any) => r.productId === context.productId],
      ['SERIES', (r: any) => context.seriesId !== null && r.seriesId === context.seriesId],
      ['BRAND', (r: any) => r.brandId === context.brandId],
      ['CATEGORY', (r: any) => r.categoryId === context.categoryId],
      ['GLOBAL', (_r: any) => true],
    ] as const;

    for (const [scope, match] of ordered) {
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

  private async validateAnswer(
    answer: AnswerInput,
    productCapabilityIds: Set<number>,
  ) {
    const item = await this.prisma.questionnaireItem.findUnique({
      where: { id: Number(answer.itemId) },
      include: {
        options: {
          include: {
            capabilities: true,
            childOptions: {
              include: { capabilities: true },
            },
          },
        },
      },
    });

    if (!item || !item.isActive) {
      throw new BadRequestException('One questionnaire answer is invalid');
    }

    const option = item.options.find(
      (candidate: any) =>
        candidate.id === Number(answer.optionId) &&
        candidate.parentOptionId === null &&
        candidate.isActive,
    );

    if (!option) {
      throw new BadRequestException('Selected answer does not belong to the question');
    }

    const optionCapabilityIds = (option.capabilities || []).map(
      (x: any) => x.capabilityId,
    );

    if (
      optionCapabilityIds.length &&
      !optionCapabilityIds.some((id: number) => productCapabilityIds.has(id))
    ) {
      throw new BadRequestException('Selected answer is not applicable to this product');
    }

    const applicableChildren = (option.childOptions || [])
      .filter((child: any) => child.isActive)
      .filter((child: any) => {
        const required = (child.capabilities || []).map(
          (x: any) => x.capabilityId,
        );
        return (
          !required.length ||
          required.some((id: number) => productCapabilityIds.has(id))
        );
      });

    const applicableIds = new Set<number>(
      applicableChildren.map((child: any) => child.id),
    );

    const selectedChildIds = [
      ...new Set((answer.childOptionIds || []).map(Number)),
    ];

    if (selectedChildIds.some((id) => !applicableIds.has(id))) {
      throw new BadRequestException('One selected sub-option is not applicable');
    }

    if (option.showChildOptions) {
      const min = option.requireChildSelection
        ? Math.max(1, option.minChildSelections || 1)
        : option.minChildSelections || 0;

      if (selectedChildIds.length < min) {
        throw new BadRequestException(`Minimum ${min} sub-option selection required`);
      }

      if (
        option.maxChildSelections &&
        selectedChildIds.length > option.maxChildSelections
      ) {
        throw new BadRequestException('Too many sub-options selected');
      }

      if (
        option.childSelectionMode === 'SINGLE' &&
        selectedChildIds.length > 1
      ) {
        throw new BadRequestException('Only one sub-option can be selected');
      }
    } else if (selectedChildIds.length) {
      throw new BadRequestException('Sub-options are not allowed for this answer');
    }

    return { option, applicableChildren, selectedChildIds };
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

    if (
      !variant ||
      !variant.isActive ||
      variant.productId !== Number(body.productId)
    ) {
      throw new NotFoundException('Selected variant is invalid');
    }

    if (!variant.product || !variant.product.isActive) {
      throw new NotFoundException('Selected product is inactive');
    }

    const basePrice = this.toNumber(variant.basePrice);

    const productCapabilityIds = new Set<number>(
      variant.product.capabilities.map((x: any) => x.capabilityId),
    );

    const context = {
      categoryId: variant.product.categoryId,
      brandId: variant.product.brandId,
      seriesId: variant.product.seriesId,
      productId: variant.productId,
      variantId: variant.id,
    };

    const answers = body.answers || [];

    const customerAudience =
      await this.prisma.questionnaireAudience.findUnique({
        where: { code: 'CUSTOMER' },
      });

    if (!customerAudience) {
      throw new BadRequestException('Customer questionnaire audience is not configured');
    }

    const requiredQuestions = await this.prisma.questionnaireItem.findMany({
      where: {
        isActive: true,
        isRequired: true,
        section: { isActive: true },
        audiences: { some: { audienceId: customerAudience.id } },
        OR: [
          { categoryId: null },
          { categoryId: variant.product.categoryId },
        ],
        AND: [
          {
            OR: [
              { applyToAllProducts: true },
              {
                productMappings: {
                  some: { productId: variant.productId },
                },
              },
            ],
          },
        ],
      },
      select: { id: true },
    });

    const answeredItemIds = new Set(answers.map((a) => Number(a.itemId)));

    if (requiredQuestions.some((q) => !answeredItemIds.has(q.id))) {
      throw new BadRequestException(
        'Please answer all required questionnaire questions',
      );
    }

    let totalDeduction = 0;
    const lines: QuoteLine[] = [];

    for (const answer of answers) {
      const validated = await this.validateAnswer(
        answer,
        productCapabilityIds,
      );

      if (validated.option.deductionTrigger === 'SELECTED') {
        const rule = await this.resolveRule(validated.option, context);
        const amount = this.calculateAmount(
          rule.deductionType,
          rule.deductionValue,
          basePrice,
        );

        if (amount > 0) {
          totalDeduction += amount;
          lines.push({
            optionId: validated.option.id,
            issueCode: validated.option.issueCode || null,
            label: validated.option.label,
            deduction: amount,
          });
        }
      }

      if (validated.option.showChildOptions) {
        for (const child of validated.applicableChildren) {
          const selected = validated.selectedChildIds.includes(child.id);
          const shouldDeduct =
            child.deductionTrigger === 'SELECTED' ? selected : !selected;

          if (!shouldDeduct) continue;

          const rule = await this.resolveRule(child, context);
          const amount = this.calculateAmount(
            rule.deductionType,
            rule.deductionValue,
            basePrice,
          );

          if (amount > 0) {
            totalDeduction += amount;
            lines.push({
              optionId: child.id,
              issueCode: child.issueCode || null,
              label: child.label,
              deduction: amount,
            });
          }
        }
      }
    }

    totalDeduction = Math.min(basePrice, Math.max(0, totalDeduction));

    return {
      basePrice: Math.round(basePrice),
      totalDeduction: Math.round(totalDeduction),
      finalPrice: Math.max(0, Math.round(basePrice - totalDeduction)),
      lines,
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

    // LOCAL DEV: OTP is returned to frontend.
    // PRODUCTION: connect SMS provider here and do not expose OTP.
    return {
      sessionId,
      expiresInSeconds: 300,
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
    };
  }

  async verifyOtp(sessionId: string, otp: string) {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new UnauthorizedException('OTP session is invalid or expired');
    }

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
      basePrice: session.quote.basePrice,
      totalDeduction: session.quote.totalDeduction,
      finalPrice: session.quote.finalPrice,
      lines: session.quote.lines,
    };

    this.sessions.delete(sessionId);
    return result;
  }
}
