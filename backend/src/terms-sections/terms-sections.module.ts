import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';

import { TermsSectionsController } from './terms-sections.controller.js';
import { TermsSectionsService } from './terms-sections.service.js';

@Module({
  imports: [PrismaModule],

  controllers: [
    TermsSectionsController,
  ],

  providers: [
    TermsSectionsService,
  ],
})
export class TermsSectionsModule {}