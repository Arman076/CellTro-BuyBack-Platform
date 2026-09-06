import { Module } from '@nestjs/common';

import { ProductSeriesController } from './product-series.controller.js';
import { ProductSeriesService } from './product-series.service.js';

@Module({
  controllers: [
    ProductSeriesController,
  ],

  providers: [
    ProductSeriesService,
  ],
})
export class ProductSeriesModule {}