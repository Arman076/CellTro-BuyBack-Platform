import { PartialType } from '@nestjs/mapped-types';
import { CreateProductSeriesDto } from './create-product-series.dto.js';

export class UpdateProductSeriesDto extends PartialType(
  CreateProductSeriesDto,
) {}