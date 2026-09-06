import { Module } from '@nestjs/common';

import { VariantsController } from './variants.controller.js';
import { VariantsService } from './variants.service.js';

@Module({
  controllers: [VariantsController],
  providers: [VariantsService],
})
export class VariantsModule {}