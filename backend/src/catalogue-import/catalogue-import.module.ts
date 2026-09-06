import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';

import { CatalogueImportController } from './catalogue-import.controller.js';
import { CatalogueImportService } from './catalogue-import.service.js';

@Module({
  imports: [
    PrismaModule,
  ],

  controllers: [
    CatalogueImportController,
  ],

  providers: [
    CatalogueImportService,
  ],
})
export class CatalogueImportModule {}