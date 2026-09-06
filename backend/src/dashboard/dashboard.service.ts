import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [
      categories,
      brands,
      models,
      variants,
      questionnaireQuestions,
      deductionRules,
    ] = await Promise.all([
      this.prisma.category.count(),
      this.prisma.brand.count(),
      this.prisma.product.count(),
      this.prisma.productVariant.count(),

      // Questionnaire already exists in schema.
      // Keeping these here means dashboard will automatically work
      // when questionnaire development is resumed.
      this.prisma.questionnaireItem.count({
        where: {
          isActive: true,
        },
      }),

      this.prisma.questionnaireDeductionRule.count({
        where: {
          isActive: true,
        },
      }),
    ]);

    return {
      catalogue: {
        categories,
        brands,
        models,
        variants,
      },

      questionnaire: {
        questions: questionnaireQuestions,
        deductionRules,
      },
    };
  }
}