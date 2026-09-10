import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';

import { QuestionnaireController } from './questionnaire.controller.js';
import { QuestionnaireService } from './questionnaire.service.js';

import { QuestionnaireDeductionController } from './questionnaire-deduction.controller.js';
import { QuestionnaireDeductionService } from './questionnaire-deduction.service.js';

import { QuestionnaireCapabilityController } from './questionnaire-capability.controller.js';
import { QuestionnaireCapabilityService } from './questionnaire-capability.service.js';

import { QuestionnaireBranchController } from './questionnaire-branch.controller.js';
import { QuestionnaireBranchService } from './questionnaire-branch.service.js';

import { QuestionnaireQuoteController } from './questionnaire-quote.controller.js';
import { QuestionnaireQuoteService } from './questionnaire-quote.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [
    QuestionnaireController,
    QuestionnaireDeductionController,
    QuestionnaireCapabilityController,
    QuestionnaireBranchController,
    QuestionnaireQuoteController,
  ],
  providers: [
    QuestionnaireService,
    QuestionnaireDeductionService,
    QuestionnaireCapabilityService,
    QuestionnaireBranchService,
    QuestionnaireQuoteService,
  ],
  exports: [
    QuestionnaireService,
    QuestionnaireDeductionService,
    QuestionnaireCapabilityService,
    QuestionnaireBranchService,
    QuestionnaireQuoteService,
  ],
})
export class QuestionnaireModule {}
