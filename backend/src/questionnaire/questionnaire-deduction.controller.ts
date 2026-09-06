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
  async getRules(
    @Query('itemId') itemId?: string,
    @Query('optionId') optionId?: string,
  ): Promise<any> {
    return this.deductionService.getRules(
      itemId ? Number(itemId) : undefined,
      optionId ? Number(optionId) : undefined,
    );
  }

  @Post('bulk')
  async bulkCreateOrUpdate(
    @Body()
    body: {
      itemId: number;
      optionId: number;
      productIds: number[];
      deductionPercent: number;
      updateExisting?: boolean;
    },
  ): Promise<any> {
    return this.deductionService.bulkCreateOrUpdate(
      body,
    );
  }

  @Patch(':id')
  async updateRule(
    @Param('id') id: string,
    @Body()
    body: {
      deductionPercent: number;
    },
  ): Promise<any> {
    return this.deductionService.updateRule(
      Number(id),
      body.deductionPercent,
    );
  }

  @Delete(':id')
  async removeRule(
    @Param('id') id: string,
  ): Promise<any> {
    return this.deductionService.removeRule(
      Number(id),
    );
  }
}