import {
  Body,
  Controller,
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
  constructor(
    private readonly service: QuestionnaireBranchService,
  ) {}

  @Get('branch/questions')
  getBuilderQuestions() {
    return this.service.getBuilderQuestions();
  }

  @Get('branch/questions/:id')
  getBuilderQuestion(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.getBuilderQuestion(id);
  }

  @Post('branch/questions')
  createQuestion(@Body() body: any) {
    return this.service.createQuestion(body);
  }

  @Put('branch/questions/:id')
  updateQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.service.updateQuestion(id, body);
  }

  @Patch('branch/questions/:id/status')
  setStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.service.setStatus(id, Boolean(isActive));
  }

  @Get('effective')
  getEffective(
    @Query('productId', ParseIntPipe) productId: number,
    @Query('audience') audience?: string,
  ) {
    return this.service.getEffectiveQuestionnaire(
      productId,
      audience || 'CUSTOMER',
    );
  }
}
