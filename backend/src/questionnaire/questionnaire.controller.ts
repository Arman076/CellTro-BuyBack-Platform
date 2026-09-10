import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { QuestionnaireService } from './questionnaire.service.js';

type DeductionType = 'PERCENTAGE' | 'FIXED';
type DeductionTrigger = 'SELECTED' | 'MISSING';

type OptionBody = {
  label: string;
  value: string;
  issueCode?: string | null;
  deductionPercent?: number;
  deductionType?: DeductionType;
  deductionValue?: number;
  deductionTrigger?: DeductionTrigger;
  capabilityIds?: number[];
  displayOrder?: number;
  isActive?: boolean;
};

@Controller('questionnaire')
export class QuestionnaireController {
  constructor(
    private readonly questionnaireService: QuestionnaireService,
  ) {}

  @Get('audiences')
  getAudiences() {
    return this.questionnaireService.getAudiences();
  }

  @Post('audiences')
  createAudience(
    @Body()
    body: {
      code: string;
      name: string;
      displayOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.questionnaireService.createAudience(body);
  }

  @Get('sections')
  getSections() {
    return this.questionnaireService.getSections();
  }

  @Post('sections')
  createSection(
    @Body()
    body: {
      code: string;
      name: string;
      displayOrder?: number;
      isActive?: boolean;
      calculationMode?: 'MAX' | 'SUM' | 'SINGLE';
    },
  ) {
    return this.questionnaireService.createSection(body);
  }

  @Get('questions')
  getQuestions(
    @Query('categoryId') categoryId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('audienceId') audienceId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.questionnaireService.getQuestions({
      categoryId: categoryId ? Number(categoryId) : undefined,
      sectionId: sectionId ? Number(sectionId) : undefined,
      audienceId: audienceId ? Number(audienceId) : undefined,
      productId: productId ? Number(productId) : undefined,
    });
  }

  @Get('questions/:id')
  getQuestion(@Param('id', ParseIntPipe) id: number) {
    return this.questionnaireService.getQuestion(id);
  }

  @Post('questions')
  createQuestion(
    @Body()
    body: {
      code: string;
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
      options: OptionBody[];
    },
  ) {
    return this.questionnaireService.createQuestion(body);
  }

  @Patch('questions/:id')
  updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      questionText?: string;
      answerType?: 'YES_NO' | 'SINGLE_SELECT' | 'MULTI_SELECT';
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
    return this.questionnaireService.updateQuestion(id, body);
  }

  @Delete('questions/:id')
  removeQuestion(@Param('id', ParseIntPipe) id: number) {
    return this.questionnaireService.removeQuestion(id);
  }

  @Post('questions/:id/options')
  addOption(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: OptionBody,
  ) {
    return this.questionnaireService.addOption(id, body);
  }

  @Patch('options/:id')
  updateOption(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: Partial<Omit<OptionBody, 'value'>> & {
      value?: string;
    },
  ) {
    return this.questionnaireService.updateOption(id, body);
  }

  @Delete('options/:id')
  removeOption(@Param('id', ParseIntPipe) id: number) {
    return this.questionnaireService.removeOption(id);
  }

  @Post('questions/:id/conditions')
  addCondition(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { dependsOnOptionId: number },
  ) {
    return this.questionnaireService.addCondition(
      id,
      body.dependsOnOptionId,
    );
  }

  @Delete('conditions/:id')
  removeCondition(@Param('id', ParseIntPipe) id: number) {
    return this.questionnaireService.removeCondition(id);
  }
}
