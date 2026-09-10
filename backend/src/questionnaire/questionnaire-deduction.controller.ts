import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { QuestionnaireDeductionService } from './questionnaire-deduction.service.js';

@Controller('questionnaire/deduction-rules')
export class QuestionnaireDeductionController {
  constructor(
    private readonly deductionService: QuestionnaireDeductionService,
  ) {}

  @Get()
  getRules(
    @Query('itemId') itemId?: string,
    @Query('optionId') optionId?: string,
  ) {
    return this.deductionService.getRules(
      itemId ? Number(itemId) : undefined,
      optionId ? Number(optionId) : undefined,
    );
  }

  @Post('scoped')
  createOrUpdateScopedRule(
    @Body()
    body: {
      itemId: number;
      optionId: number;
      scope:
        | 'GLOBAL'
        | 'CATEGORY'
        | 'BRAND'
        | 'SERIES'
        | 'PRODUCT'
        | 'VARIANT';
      targetId?: number | null;
      deductionType: 'PERCENTAGE' | 'FIXED';
      deductionValue: number;
      priority?: number;
    },
  ) {
    return this.deductionService.createOrUpdateScopedRule(body);
  }

  @Post('bulk')
  bulkCreateOrUpdate(
    @Body()
    body: {
      itemId: number;
      optionId: number;
      productIds: number[];
      deductionPercent: number;
      updateExisting?: boolean;
    },
  ) {
    return this.deductionService.bulkCreateOrUpdate(body);
  }

  @Patch(':id')
  updateRule(
    @Param('id') id: string,
    @Body() body: { deductionPercent: number },
  ) {
    return this.deductionService.updateRule(
      Number(id),
      body.deductionPercent,
    );
  }

  @Delete(':id')
  removeRule(@Param('id') id: string) {
    return this.deductionService.removeRule(Number(id));
  }
}
