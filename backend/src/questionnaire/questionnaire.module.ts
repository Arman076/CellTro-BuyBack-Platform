import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';

import { QuestionnaireController } from './questionnaire.controller.js';
import { QuestionnaireService } from './questionnaire.service.js';

import { QuestionnaireDeductionController } from './questionnaire-deduction.controller.js';
import { QuestionnaireDeductionService } from './questionnaire-deduction.service.js';

@Module({
  imports: [PrismaModule],

  controllers: [
    QuestionnaireController,
    QuestionnaireDeductionController,
  ],

  providers: [
    QuestionnaireService,
    QuestionnaireDeductionService,
  ],

  exports: [
    QuestionnaireService,
    QuestionnaireDeductionService,
  ],
})
export class QuestionnaireModule {}