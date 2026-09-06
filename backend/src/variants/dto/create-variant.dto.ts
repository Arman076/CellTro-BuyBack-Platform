import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

export class VariantValueDto {
  @IsInt()
  attributeId: number;

  @IsInt()
  optionId: number;
}

export class CreateVariantDto {
  @IsInt()
  productId: number;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantValueDto)
  values: VariantValueDto[];
}