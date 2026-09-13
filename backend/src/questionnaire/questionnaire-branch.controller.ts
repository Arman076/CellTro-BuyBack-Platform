import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { QuestionnaireBranchService } from './questionnaire-branch.service.js';

@Controller('questionnaire')
export class QuestionnaireBranchController {
  constructor(private readonly service: QuestionnaireBranchService) {}

  @Get('branch/questions')
  getBuilderQuestions() { return this.service.getBuilderQuestions(); }

  @Get('branch/questions/:id')
  getBuilderQuestion(@Param('id', ParseIntPipe) id: number) {
    return this.service.getBuilderQuestion(id);
  }

  @Post('branch/questions')
  createQuestion(@Body() body: any) { return this.service.createQuestion(body); }

  @Put('branch/questions/:id')
  updateQuestion(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.updateQuestion(id, body);
  }

  @Patch('branch/questions/:id/status')
  setStatus(@Param('id', ParseIntPipe) id: number, @Body('isActive') isActive: boolean) {
    return this.service.setStatus(id, Boolean(isActive));
  }

  @Delete('branch/questions/:id')
  deleteQuestion(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteQuestion(id);
  }

  @Post('branch/sections')
  createSection(@Body() body: any) { return this.service.createSection(body); }

  @Patch('branch/options/:id/policy')
  updateOptionPolicy(@Param('id', ParseIntPipe) id: number, @Body() body: any) {
    return this.service.updateOptionPolicy(id, body);
  }

  @Get('deduction-rules')
  getDeductionRules(@Query('optionId', ParseIntPipe) optionId: number) {
    return this.service.getDeductionRules(optionId);
  }

  @Post('deduction-rules/scoped')
  upsertScopedDeductionRule(@Body() body: any) {
    return this.service.upsertScopedDeductionRule(body);
  }

  @Get('quote-policy')
  getQuotePolicy(@Query('productId') productId?: string) {
    const id = productId ? Number(productId) : null;
    if (productId && (!Number.isInteger(id) || id! <= 0)) {
      throw new BadRequestException('Invalid productId');
    }
    return this.service.getQuotePolicy(id);
  }

  @Put('quote-policy')
  saveQuotePolicy(@Body() body: any) { return this.service.saveQuotePolicy(body); }

  @Get('effective')
  getEffective(
    @Query('productId', ParseIntPipe) productId: number,
    @Query('audience') audience?: string,
    @Query('variantId') variantId?: string,
  ) {
    const parsedVariantId = variantId ? Number(variantId) : null;
    if (variantId && (!Number.isInteger(parsedVariantId) || parsedVariantId! <= 0)) {
      throw new BadRequestException('Invalid variantId');
    }
    return this.service.getEffectiveQuestionnaire(productId, audience || 'CUSTOMER', parsedVariantId);
  }
}
