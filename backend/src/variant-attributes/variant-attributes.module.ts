import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { VariantAttributesController } from './variant-attributes.controller.js';
import { VariantAttributesService } from './variant-attributes.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [VariantAttributesController],
  providers: [VariantAttributesService],
})
export class VariantAttributesModule {}
